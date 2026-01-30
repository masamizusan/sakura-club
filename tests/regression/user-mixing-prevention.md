# リグレッションテスト: ユーザー混線防止（masamizu→marco上書き事故）

## 事故概要（2026-01-30発生・修繕完了）

TEST modeの`ensureTestAnonSession`が、トークンリフレッシュ等で`getCurrentUser()`が
一瞬nullになった瞬間に発火し、`signInAnonymously()`で匿名ユーザー(588a20ac)の
セッションが実ユーザー(2b6f201e)を上書き。以後`auth.uid()`が588a20acになり
RLSで2b6f201eのprofileが読めず完成度崩壊。

## 修繕コミット

- `7cc28fb8` Security: 匿名セッション上書き防止・二重保存防止・legacy id撤廃
- `3861ef2f` Security: 匿名セッション3重ガード + ユーザー切替ガード + 401退避強化

## テストパターン

### パターン1: 基本導線（必須・毎回）

1. 実ユーザー(masamizu)でログイン
2. MyPage表示 → 完成度が正常(100%等)
3. MyPage → Edit（fromMyPage=true）
4. Edit表示直後にデータが消えていないこと（趣味/性格/画像が0件にならない）
5. Preview遷移
6. 確定保存 → MyPage戻り
7. MyPage → Edit再遷移 → 全データが保持されていること

**確認ログ:**
- `🔒 SSOT_ID_CHECK {route: '/mypage', ..., ok: true}`
- `🔒 SSOT_ID_CHECK {route: '/profile/edit', ..., ok: true}`
- `🔒 SSOT_ID_CHECK {route: '/profile/preview/confirm', ..., ok: true}`
- `✅ PRE-SAVE ASSERT GATE: all checks passed`
- `✅ saveProfileToDb: ユーザーID一致確認OK`

**NG条件（1つでも出たらバグ）:**
- `🚨 SSOT_ID_CHECK FAILED`
- `🚨 PRE-SAVE ASSERT FAILED`
- `🚨 USER_ID_MISMATCH BLOCK SAVE`
- `🚨 USER SWITCH DETECTED`
- `CONFIRM_BLOCKED_DUPLICATE`（二重保存発生）

### パターン2: トークンリフレッシュ耐性（重要）

1. パターン1のStep 5（Preview確定）直後に**30秒待機**
2. Chrome DevTools → Network → Throttling: Slow 3G に切替
3. MyPage操作（更新・遷移）
4. 完成度が崩壊しないこと

**確認ログ:**
- `🔒 ensureTestAnonSession: 実ユーザーログイン済み - anonymous sign-in 完全スキップ`
- `🔒 getCurrentUser: 匿名セッション生成を禁止 {reason: 'REAL_USER_LOGGED_IN'}`

**NG条件:**
- `🧪 ensureTestAnonSession: 新規anonymous sign-in実行...`（実ユーザーログイン中に出たらバグ）

### パターン3: 画像削除の確実反映（TaskD）

1. Edit画面で写真を1枚削除
2. Preview → 確定保存
3. DB保存成功ログ確認（TASKD_PROOF）
4. MyPageで写真が減っていること

### パターン4: ensure-profile 401耐性

1. ブラウザのCookieを手動削除（またはシークレットモードで未ログイン状態を作る）
2. Preview確定を試行
3. `/login?reason=ensure_401`にリダイレクトされること

### パターン5: 二重クリック防止

1. Preview確定ボタンを高速で2回クリック
2. 保存が1回だけ実行されること
3. `CONFIRM_BLOCKED_DUPLICATE`ログが2回目で出ること

## 防御層の確認チェックリスト

| 防御層 | 確認方法 |
|--------|---------|
| sc_real_login_user フラグ | ログイン後に `localStorage.getItem('sc_real_login_user')` が userId |
| 3重ガード（getCurrentUser） | edit/preview/mypageで `匿名セッション生成を禁止` ログ |
| ルート制限（ensureTestAnonSession） | edit/preview/mypageで `匿名禁止ルート - 完全スキップ` ログ |
| SSOT_ID_CHECK | 3地点で `ok: true` |
| PRE-SAVE ASSERT GATE | Preview confirm前に `all checks passed` |
| 二重保存防止 | isSavingRef による mutex |
| ユーザー切替ガード | authStoreで `USER SWITCH DETECTED` → mypage退避 |
| saveProfileToDb ID一致チェック | `ユーザーID一致確認OK` |

## DB検証SQL

```sql
-- 同一user_idに重複行がないこと
SELECT user_id, count(*) FROM profiles GROUP BY user_id HAVING count(*) > 1;

-- user_idがnullの行がないこと
SELECT id, user_id, name FROM profiles WHERE user_id IS NULL;

-- 特定ユーザーのprofileが正しいこと
SELECT id, user_id, name, avatar_url, photo_urls, personality_tags
FROM profiles WHERE user_id = '2b6f201e-aebb-4c8c-9ee2-e1c2a96c8302';
```

## 運用チェック（週1 / 障害時）

以下のクエリは**読み取り専用（SELECT）**です。変更を伴いません。
Supabase SQL Editorでそのまま実行可能です。

### チェック1: ユーザーID不整合の検出（0件が正常）

```sql
-- profile_photo_cleanup_logs で auth_uid ≠ user_id の危険イベントを検出
-- 直近7日間で不整合が0件であること
SELECT *
FROM profile_photo_cleanup_logs
WHERE created_at > now() - interval '7 days'
  AND user_id NOT IN (
    SELECT user_id FROM profiles WHERE user_id IS NOT NULL
  );
-- 期待: 0行
```

### チェック2: photo_urls と avatar_url の整合性（0件が正常）

```sql
-- photo_urls が空配列なのに avatar_url が残っている不整合を検出
SELECT id, user_id, name,
       avatar_url,
       photo_urls::text as photo_urls_raw,
       CASE
         WHEN (photo_urls IS NULL OR photo_urls::text = '[]' OR photo_urls::text = 'null')
              AND avatar_url IS NOT NULL AND avatar_url != ''
         THEN 'MISMATCH: photo_urls empty but avatar_url exists'
         WHEN photo_urls IS NOT NULL AND photo_urls::text != '[]' AND photo_urls::text != 'null'
              AND (avatar_url IS NULL OR avatar_url = '')
         THEN 'MISMATCH: photo_urls exists but avatar_url empty'
         ELSE 'OK'
       END as check_result
FROM profiles
WHERE (
  -- photo_urls空なのにavatar_urlあり
  ((photo_urls IS NULL OR photo_urls::text = '[]' OR photo_urls::text = 'null')
   AND avatar_url IS NOT NULL AND avatar_url != '')
  OR
  -- photo_urlsありなのにavatar_urlなし
  (photo_urls IS NOT NULL AND photo_urls::text != '[]' AND photo_urls::text != 'null'
   AND (avatar_url IS NULL OR avatar_url = ''))
);
-- 期待: 0行（不整合なし）
```

### チェック3: profiles重複・孤立行の検出（0件が正常）

```sql
-- user_id重複
SELECT user_id, count(*) as cnt
FROM profiles
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING count(*) > 1;
-- 期待: 0行

-- user_id未設定の孤立行
SELECT id, name, email, created_at
FROM profiles
WHERE user_id IS NULL;
-- 期待: 0行
```

### チェック4: 直近の保存が正しいユーザーで行われたか（証跡確認）

```sql
-- 直近の cleanup_logs が正当なユーザーの操作か確認
SELECT
  l.user_id as log_user_id,
  p.user_id as profile_user_id,
  l.deleted_paths,
  l.created_at,
  CASE WHEN l.user_id = p.user_id THEN 'OK' ELSE 'MISMATCH' END as check
FROM profile_photo_cleanup_logs l
LEFT JOIN profiles p ON l.user_id = p.user_id
WHERE l.created_at > now() - interval '7 days'
ORDER BY l.created_at DESC
LIMIT 20;
-- 期待: 全行が check = 'OK'
```

### 運用ルール

| 頻度 | 対象 | アクション |
|------|------|-----------|
| 週1回 | チェック1〜3 | 全て0行であることを確認。異常があればSlack通知 |
| 障害時 | チェック1〜4 | 全て実行。MISMATCH行があれば該当user_idを調査 |
| デプロイ後 | チェック2〜3 | マイグレーション影響の即時確認 |

### PRE_SAVE_BLOCKED reason 定数一覧

| reason | 意味 | 退避先 |
|--------|------|--------|
| `no_auth_user` | authUser が null（セッション切れ） | `/login` |
| `real_login_mismatch` | `sc_real_login_user` ≠ `authUser.id`（別ユーザーに切り替わった） | `/login` |
| `owner_user_mismatch` | `__ownerUserId` ≠ `authUser.id`（プレビューデータの所有者不一致） | `/mypage` |
| `ensure_401` | ensure-profile API が 401（サーバー側で認証失敗） | `/login` |
| `user_switched` | authStore でユーザーID変更を検出 | `/mypage` |
