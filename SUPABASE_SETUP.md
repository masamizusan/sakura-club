# 🗄️ SAKURA CLUB - Supabase設定ガイド

## 概要
SAKURA CLUBアプリのSupabase設定手順書です。

## 📋 設定済み項目
- ✅ 環境変数設定 (.env.local)
- ✅ Supabaseクライアント設定
- ✅ 認証システム実装
- ✅ データベーススキーマ作成

## 🚀 セットアップ手順

### 1. Supabaseプロジェクトの確認
現在の設定:
```
Project URL: https://zrdzyzphrubeaafbkjtr.supabase.co
```

### 2. データベーススキーマの実行

Supabaseダッシュボードにログインして、以下の手順でスキーマを実行:

1. **SQL Editorにアクセス**
   - Supabaseダッシュボード → SQL Editor

2. **スキーマ実行**
   ```sql
   -- database/schema.sql の内容をコピー＆ペースト
   -- 一度に全て実行可能
   ```

3. **サンプルデータ投入（オプション）**
   ```sql
   -- database/sample-data.sql の内容をコピー＆ペースト
   -- 開発・テスト用
   ```

### 3. ストレージ設定（プロフィール画像用）

```sql
-- ストレージバケットの作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- ストレージポリシーの設定
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. 認証設定

Supabaseダッシュボード → Authentication → Settings:

1. **Site URL設定**
   ```
   Site URL: http://localhost:3000
   ```

2. **Redirect URLs設定**
   ```
   http://localhost:3000/auth/callback
   ```

3. **Email Templates** (オプション)
   - 確認メール
   - パスワードリセットメール

### 5. セキュリティ設定

1. **RLS (Row Level Security)**
   - ✅ 既にスキーマで有効化済み

2. **API設定**
   - API URL: スキーマ実行後に確認
   - Anon Key: 既に設定済み

## 📊 作成されるテーブル

| テーブル名 | 説明 | 主要カラム |
|-----------|------|----------|
| `profiles` | ユーザープロフィール | id, email, name, gender, age |
| `experiences` | 文化体験 | id, title, category, date, location |
| `experience_participants` | 体験参加者 | experience_id, participant_id |
| `matches` | マッチング | user1_id, user2_id, matched_at |
| `messages` | メッセージ | match_id, sender_id, content |
| `reviews` | レビュー | experience_id, reviewer_id, rating |
| `notifications` | 通知 | user_id, type, message |
| `user_likes` | いいね/パス | liker_id, liked_id, liked |

## 🔧 開発環境での確認

### 1. 接続テスト
```bash
npm run dev
```

### 2. 認証テスト
- ユーザー登録 → `/signup`
- ログイン → `/login`
- プロフィール編集 → `/profile/edit`

### 3. 基本機能テスト
- 文化体験一覧 → `/experiences`
- マッチング → `/matches`
- メッセージ → `/messages`

## 🚨 トラブルシューティング

### よくある問題

1. **認証エラー**
   ```
   解決: Supabase URL/Keyの再確認
   ```

2. **RLSエラー**
   ```
   解決: ポリシーの確認、auth.uid()の確認
   ```

3. **スキーマエラー**
   ```
   解決: 順番通りにSQL実行、依存関係の確認
   ```

## 📱 本番環境への移行

1. **新しいSupabaseプロジェクト作成**
2. **本番用環境変数の設定**
3. **スキーマとポリシーの実行**
4. **DNS/ドメイン設定の更新**

## 🔗 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)

---

## ✅ 完了チェックリスト

- [ ] Supabaseプロジェクト確認
- [ ] データベーススキーマ実行
- [ ] ストレージ設定
- [ ] 認証設定確認
- [ ] 開発環境での動作確認
- [ ] 基本機能テスト