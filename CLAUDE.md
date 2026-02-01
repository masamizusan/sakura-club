# Claude Code セッション情報

## 🔒 重要：プロフィール完成度問題の完璧な解決状態
この設定は**絶対に変更しない**でください。現在の実装は完璧に動作しています。

### ⚠️ 🚨 CRITICAL WARNING 🚨 ⚠️
**プロフィール完成度計算システムは絶対に変更禁止**

このシステムは数ヶ月にわたる複雑な修正の末に完成した完璧な状態です。
どのような理由があっても、どんな小さな変更も、完成度計算に関連する
ファイルやロジックを変更することは**絶対に禁止**されています。

**変更禁止の理由:**
- マイページ→プロフィール編集画面での100%完成度一貫性が完璧に動作
- 画像データの5つのフォールバック検出が完璧に実装済み
- 外国人男性17項目・日本人女性14項目の完成度計算が完璧
- 遅延計算問題が完全に解決済み
- fromMyPage遷移での画像読み込みが完璧に動作

**一つでも変更すると全体が崩壊するリスクが極めて高い**

### ✅ 完全解決済み問題
- ✅ マイページ（100%）→プロフィール編集画面（100%）一貫性問題
- ✅ 「100%表示→数秒後92%」遅延計算問題
- ✅ 日本人女性のプレビュー画面での国籍表示問題
- ✅ 職業選択肢「主婦」の順序問題
- ✅ **外国人男性の完成度100%→80%問題（2025-10-03完全解決）**
- ✅ **新規登録時の外国人男性専用フィールド不正保存問題（2025-10-03完全解決）**
- ✅ **日本文化と性格のチェックボックス完成度計算問題（2025-10-05完全解決）**
- ✅ **新規ユーザー初期完成度5/15・5/13問題（2025-10-05完全解決）**
- ✅ **デプロイ直後の新規ユーザー完成度問題（2025-10-05完全解決）**
- ✅ **外国人男性・日本人女性の言語レベル項目追加（2025-10-08完全実装）**
- ✅ **外国人男性の「訪問予定の駅」項目追加（2025-10-08完全実装）**
- ✅ **都道府県・駅選択のアコーディオンUI統一（2025-10-08完全実装）**
- ✅ **🎯 マイページ→プロフィール編集画面の画像データ完成度計算問題（2025-11-02完全解決）**
- ✅ **🌐 日本人女性向け多言語対応プロフィール編集機能（2025-11-04完全実装）**
- ✅ **🌐 プレビュー画面言語切り替え機能（2025-11-04完全実装）**
- ✅ **🖼️ プレビュー画面画像表示サイズ統一（2025-11-04完全実装）**
- ✅ **🎨 プレビューボタン小豆色デザイン改善（2025-11-04完全実装）**
- ✅ **📍 「現在日本にいる」訪問予定選択肢追加（2025-11-04完全実装）**
- ✅ **🌍 プロフィール編集→プレビュー→マイページサイクルの完全多言語対応（2025-11-23完成）**
- ✅ **🔧 プロフィール完成度50%問題の完全解決（2025-11-27完成）**
- ✅ **🗂️ city JSON専用カラム化システムの完全実装（2025-11-27完成）**
- ✅ **🗑️ タスクD: プロフィール写真ゴミ削除の完全実装（2026-01-22完成）**
- ✅ **🔒 ユーザーID変更検出の誤発火防止 + 保存時ID一致チェック（2026-01-25完成）**

### 🏆 完成記録：タスクD - プロフィール写真ゴミ削除（2026-01-22）
**プロフィール編集で写真を追加・削除した際に、Supabase Storage（avatars）内に残る「不要な画像（ゴミ）」を自動削除し、DB（profiles.photo_urls）に参照されている画像だけをStorageに残すことを保証する機能が完成しました。**

#### 📋 根本原因と修正
**根本原因**: `cleanupRemovedImages()` が非同期実行（awaitなし）だったため、プレビュー画面で「確定」を押した直後にページ遷移（Preview → MyPage）が発生すると、削除処理が完了する前に実行が途切れてStorage削除が実行されないケースがあった。

**修正内容**:
```typescript
// 修正前（中断される可能性）
cleanupRemovedImages(...).catch(err => {...})

// 修正後（完了を必ず待つ）
const cleanupResult = await cleanupRemovedImages(...)
```

#### 🛠️ 動作仕様
プレビュー確定時に以下を実行：
1. `old_photo_urls`（確定前のDB参照）と `new_photo_urls`（確定後のDB参照）を比較
2. `new`に存在しない`old`の画像を「削除対象」として特定
3. Storageの該当ファイルを削除
4. 証跡として `profile_photo_cleanup_logs` に記録

#### ✅ 完了条件（証拠付き）
| 条件 | 確認方法 |
|------|----------|
| A: Storage削除が実行される | `orphan_count = 0`（DBから参照されていないStorage画像が0件） |
| B: 証跡ログが残る | `profile_photo_cleanup_logs`に新行追加、`deleted_paths`に削除件数 |

#### 📊 検証用SQL
```sql
-- 証跡ログ確認
SELECT * FROM profile_photo_cleanup_logs
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC LIMIT 5;

-- orphan数（DBから参照されていないStorage画像）
WITH current_urls AS (
  SELECT jsonb_array_elements_text(coalesce(photo_urls, '[]'::jsonb)) as url
  FROM public.profiles WHERE id = '<USER_ID>'
),
current_names AS (
  SELECT regexp_replace(url, '^https?://[^/]+/storage/v1/object/public/avatars/', '') as name
  FROM current_urls
)
SELECT count(*) as orphan_count
FROM storage.objects
WHERE bucket_id = 'avatars'
  AND name LIKE '<USER_ID>/%'
  AND name NOT IN (SELECT name FROM current_names);
```

#### 🛡️ 保護対象ファイル
- **`src/utils/saveProfileToDb.ts`**: cleanupRemovedImages関数（await必須）
- **`supabase/migrations/20250122_add_photo_cleanup_logs.sql`**: 証跡テーブル

---

### 🌸 プロフィール編集〜プレビュー〜マイページ遷移（固定仕様）（2026-01-25完成）
**本セクションは、プロフィール編集フローが今後いかなる修正でも崩れないように、挙動・設計・保護ポイントを固定するものです。**

#### ✅ 対象フロー（日本人女性・外国人男性共通）
1. ログイン
2. マイページ表示（DB反映済み）
3. マイページ → プロフィール編集へ遷移（fromMyPage=true）
4. プロフィール編集 → プレビュー
5. プレビュー確定 → DB保存（TaskD含む）
6. 保存後マイページへ戻る
7. 再びマイページ → 編集へ戻る（データ保持）

#### ✅ 完了状態（現時点の正しい挙動）

**A. ユーザーIDは遷移中に変わらない**
- MyPage / Edit / Preview / Save 全区間で user.id が一貫していること
- 誤検出で「ユーザーIDが変わった扱い」になり、趣味/性格/写真が消える事故を防止済み

**B. MyPage → Edit でデータが消えない**
- fromMyPage=true の遷移では新規登録扱いにしない
- 趣味/性格/言語/画像が0件にリセットされない
- 一瞬 state の初期値が空になるログは出てもOK（DBロード後に確実に復元されること）

**C. 画像削除が確実に反映される（TaskD証跡あり）**
- 編集画面で画像削除 → プレビュー → 確定 → DB保存で削除が確実に反映
- TaskDの証跡ログが残り、削除の実施が確認できる

**D. 保存の誤爆（別ユーザーへ保存）を絶対に防ぐ**
- saveProfileToDb 実行時にセッション user.id と引数 userId が一致しなければ保存をブロック
- この一致チェックは今後も絶対に消してはいけない

#### ✅ 実装上の重要変更点（固定）

**1) Profile Edit画面：ユーザーID変更検出の誤発火を防止**
- ファイル: `src/app/profile/edit/page.tsx`
- `prevUserIdRef`を導入して「初回判定では変更扱いしない」
- 修正ルール（絶対維持）：
  - 初回（prevUserId未設定）は変更判定をしない
  - isInitializing=true 中は判定しない
  - fromMyPage=true の場合はリセット禁止
  - 両方揃って明確に変化した場合のみ "変更検出" とする

**期待ログ（正しい状態）:**
```
🔒 ユーザーID変更検出: 初回スキップ（prevUserId未設定）
🔒 ユーザーID変更検出: fromMyPage遷移スキップ
```

**禁止ログ（出たらバグ）:**
```
🎯 ユーザーID変更検出 - 画像リセット実行
```

**2) saveProfileToDb：ユーザーID一致チェック（固定・削除禁止）**
- ファイル: `src/utils/saveProfileToDb.ts`
- セッションユーザーと保存対象ユーザーの id を比較し、違えば保存停止

**期待ログ:**
```
✅ saveProfileToDb: ユーザーID一致確認OK
```

#### ✅ テスト手順（毎回これで壊れてないか確認）

**パターン1：基本導線（必須）**
1. 既存ユーザーでログイン
2. MyPage表示（完成度、趣味、性格、画像が正しい）
3. MyPage → Edit（fromMyPage=true）
4. Edit表示直後にデータが消えない
5. Previewへ遷移
6. 確定保存 → MyPageへ戻る
7. MyPage → Editへ再遷移 → ✅ 全データが保持されること

**パターン2：画像削除の確実反映（TaskD）**
1. Editで写真を1枚削除
2. Preview → 確定
3. DB保存成功ログ確認（TASKD_PROOF）
4. MyPageで写真が減っている → ✅ 削除が反映され続けること

#### 🚫 触ってはいけない保護対象（変更禁止）
以下は "今回の安定を作っている中核" のため、今後変更禁止：
- `src/utils/profileCompletion.ts`（完成度計算の本体）
- `src/app/profile/edit/page.tsx`（fromMyPage保護・ID誤検出防止）
- `src/app/profile/preview/*`（プレビュー確定〜保存導線）
- `src/utils/saveProfileToDb.ts`（ユーザー一致チェック含む保存本体）
- photo_urls / avatar_url 同期ロジック
- TaskD（削除証跡ログ）一式

#### ✅ 今後の改修ルール（絶対）
- このフローに触れる改修では必ず上記テスト2パターンを通す
- fromMyPage=true を "安全導線" として扱い続ける
- ユーザーID一致チェック（誤保存防止）は絶対に削除しない

---

### 🏆 完成記録：プロフィール完成度50%問題 & city JSON専用カラム化（2025-11-27）
**プロフィール完成度50%問題の完全解決とcity JSON専用カラム化システムが完璧に実装されました。**

#### 📋 解決した問題一覧
1. **プロフィール完成度50%問題の完全解決**
   - プロフィール編集100% → マイページ50%に落ちる不具合を完全修正
   - 日本人女性15項目・外国人男性18項目で100%一貫性確保
   - 専用カラム優先読み込み実装で安定性向上

2. **city JSON専用カラム化の完全実装**
   - occupation/height/body_type/marital_status を専用カラムに分離
   - city JSONを新形式（`{"city":"市区町村名"}`のみ）に変更
   - 後方互換性維持で既存データからの完全移行

3. **異常系INSERT問題の完全防止**
   - interests のみ保存される不完全データ問題を解決
   - 全フィールドが確実に専用カラムに保存される仕組み確立

#### 🛠️ 実施した技術的変更
**Supabaseマイグレーション完全実行:**
```sql
-- 専用カラム追加完了
ALTER TABLE public.profiles ADD COLUMN occupation TEXT, height INTEGER, body_type TEXT, marital_status TEXT;
-- 既存データ移行完了
UPDATE public.profiles SET occupation = COALESCE(occupation, (city::jsonb ->> 'occupation')), ...;
-- city JSON新形式変換完了
UPDATE public.profiles SET city = jsonb_build_object('city', city::jsonb ->> 'city')::text ...;
```

**コード側修正完了:**
- **`src/utils/profileCompletion.ts`**: 専用カラム優先完成度計算実装
- **`src/app/profile/edit/page.tsx`**: 専用カラム読み書きロジック実装  
- **`src/app/profile/preview/page.tsx`**: completeProfileData専用カラム対応
- **`src/app/mypage/page.tsx`**: Triple-save + 専用カラム保存実装

#### ✅ 動作確認済みデータ例
**日本人女性（15項目）完璧動作:**
```csv
occupation: "会社員", height: 160, body_type: "slim", marital_status: "single"
city: {"city":"武蔵野市"}, english_level: "intermediate"
personality_tags: ["優しい","冷静",...], culture_tags: ["障子","襖の張り替え",...]
```

**外国人男性（18項目）完璧動作:**
```csv
occupation: "経営者・役員", height: 168, body_type: "slim", marital_status: "married"
visit_schedule: "2026-spring", travel_companion: "alone", planned_prefectures: ["東京都","愛知県","栃木県"]
japanese_level: "beginner", personality_tags: [...], culture_tags: [...]
```

### 🏆 完成記録：プロフィールサイクル完全多言語対応（2025-11-23）
**プロフィール編集、プレビュー、マイページのサイクルが完全に完成しました。**

#### 📋 完成した多言語対応項目一覧
1. **プレビュー画面の翻訳問題修正** - 年齢表示、季節表示、文化項目表示の完全修正
2. **カスタム翻訳システム拡張** - seasons/nationalities/culture の4言語完全対応
3. **全86文化項目の包括的マッピング** - 日本の伝統文化から現代カルチャーまで完全対応
4. **性格・食文化マッピング追加** - 性格表現と食文化項目の自然な翻訳実装
5. **「祭り参加」英語翻訳修正** - Festival Participation への適切な翻訳
6. **英語表現の自然さ改善** - プロフィール編集画面8項目の表現改善
7. **韓国語表現の自然さ改善** - プロフィール編集画面9項目の表現改善  
8. **台湾華語表現の自然さ改善** - プロフィール編集画面9項目の表現改善
9. **都道府県選択ヘルプテキストの多言語化** - 4言語完全対応
10. **選択数表示の多言語化** - 「選択済み」→「selected/선택됨/已選擇」
11. **プレビュー画面居住地表示の多言語化** - 都道府県名の4言語対応

#### 🎯 完成した表現改善の詳細

**英語表現改善（8項目）:**
- "Foreign Male Profile Edit" → "Edit Profile"
- "Update your information to meet Japanese women" → "Update your information for better matches in Japan"
- "Please fill in a bit more basic information" → "Please provide a little more basic information."
- "Birth date will not be displayed to others." → "Your date of birth will not be shown to others."
- "Age is automatically calculated from birth date" → "Your age is automatically calculated from your date of birth."
- "Not specified" → "Not set"
- "Planned Prefectures" → "Prefectures You Plan to Visit"
- "Lonely"（性格） → "Reserved"

**韓国語表현改善（9項目）:**
- "외국인 남성 프로필 편집" → "프로필 편집"
- "일본 여성과의 만남을 위해 정보를 업데이트하세요" → "더 좋은 매칭을 위해 정보를 업데이트해 주세요"
- "각 사진은 5MB 이하로 해주세요" → "각 사진은 5MB 이내로 업로드해 주세요"
- "크롭 및 흐림 효과 편집이 가능합니다" → "사진을 자르거나 흐림 효과를 적용할 수 있습니다"
- "기입하지 않음" → "미입력"
- "외로움을 타는" → "내향적인"
- "인도어" → "실내형"
- "천연" → "자연스러운 타입"
- "마이페이스" → "자기 스타일이 뚜렷한"

**台湾華語表현改善（9項目）:**
- "外國男性個人資料編輯" → "編輯個人資料"
- "為了與日本女性相遇，請更新您的資訊" → "為了更好的配對，請更新您的資訊"
- "請將每張照片保持在5MB以下" → "每張照片請控制在 5MB 以內"
- "您可以裁剪和模糊您的照片" → "您可以裁剪或套用模糊效果"
- "不填寫" → "未填寫"
- "預計前往的都道府縣" → "預計前往的地區"
- "室內派" → "偏好室內活動"
- "天然" → "自然派"
- "按自己的節奏" → "我行我素"

### 🛡️ 保護すべき最新コミット情報
- **🏆 最新の完璧なコミットID**: `9e1d2042`
- **コミットメッセージ**: "Fix: プレビュー画面の居住地表示を多言語対応"
- **日付**: 2025-11-23
- **解決内容**: プロフィールサイクル完全多言語対応の完成
- **重要なコミット系譜**:
  - `def6de2f` (日本人女性言語切り替え完全修正)
  - `e638b8c9` (多言語翻訳ファイル拡張)
  - `043dc16c` (言語選択機能実装)
  - `628e0bce` (プレビューボタン小豆色改善)
  - `1429ffdf` (「現在日本にいる」選択肢追加)
  - `d937d75c` (プレビュー画像サイズ統一)
  - `e4bdc882` (画像データ完成度計算完全修正)

### 🔧 完璧な実装の核心部分（絶対に変更禁止）

#### 1. 共通完成度計算関数 (`src/utils/profileCompletion.ts`)
```typescript
// 外国人男性のオプションフィールド（10個） - 2025-10-08最新版
optionalFields = [
  'occupation', 'height', 'body_type', 'marital_status',
  'personality', 'visit_schedule', 'travel_companion',
  'planned_prefectures', 'japanese_level', 'planned_stations'
]

// 日本人女性のオプションフィールド（8個） - 2025-10-08最新版
optionalFields = [
  'occupation', 'height', 'body_type', 'marital_status',
  'personality', 'city', 'english_level'
]

// 5つのフォールバック画像検出方法（2025-11-02最新版）
const hasImagesInArray = imageArray && imageArray.length > 0
const hasImagesInProfile = profileData && profileData.avatar_url && profileData.avatar_url !== null && profileData.avatar_url !== ''
const hasImagesInUser = profileData.avatarUrl && profileData.avatarUrl !== null && profileData.avatarUrl !== ''
const hasImagesInSession = // セッションストレージから検出
const hasImagesInLocalStorage = // localStorageから検出（fromMyPage遷移用）

return !!(hasImagesInArray || hasImagesInProfile || hasImagesInSession || hasImagesInUser || hasImagesInTestMode || hasImagesInLocalStorage)
```

#### 2. プロフィール編集画面の重要修正（2025-11-02完全版）
- **ファイル**: `src/app/profile/edit/page.tsx`
- **fromMyPage最優先処理**: localStorageから画像データを確実に読み込み
- **初期計算**: `currentImageArray` に正しい画像配列を設定
- **キーポイント**: 遅延処理なし、シンプルで確実な方法

#### 3. マイページ画像保存処理（2025-11-02完全版）
- **ファイル**: `src/app/mypage/page.tsx`
- **確実な画像URL取得**: `profile.avatar_url || profile.profile_image`
- **フォールバック**: `user.avatarUrl`も含める
- **localStorage保存**: 正しい形式で画像データを保存

#### 4. 計算タイミングの完璧な制御（2025-11-02最新版）
- **INITIAL_LOAD**: fromMyPage時にlocalStorageから画像データを確実に読み込んで100%計算
- **遅延処理削除**: 複雑な遅延計算を排除、シンプルで確実な方法

### UI修正内容
1. **国籍表示**: 日本人女性のプレビュー画面で非表示
2. **職業選択肢**: 「主婦」をリストの最上位に配置
3. **言語レベル**: 外国人男性→日本語レベル、日本人女性→英語レベル（各7段階）
4. **訪問予定の駅**: 外国人男性専用（30駅から最大5駅選択）
5. **アコーディオンUI**: 都道府県・駅選択を統一されたアコーディオン形式で実装
6. **🌐 多言語対応**: 日本人女性・外国人男性共通で4言語選択可能（2025-11-04追加）
7. **🖼️ 画像表示統一**: プレビュー画面をaspect-square形式に変更（2025-11-04追加）
8. **🎨 プレビューボタン**: 小豆色デザインで視認性向上（2025-11-04追加）
9. **📍 訪問予定選択肢**: 「現在日本にいる」オプション追加（2025-11-04追加）

### テスト確認事項
- マイページ（100%）からプロフィール編集画面への遷移でも100%維持
- コンソールで`userAvatarUrl: 'exists'`と`hasImagesInUser: true`を確認
- 画像削除/追加時の正確な完成度計算

### 🚨 緊急時の復旧コマンド（2025-11-23最新版）
```bash
# 🔴 CRITICAL: 完成度計算システム緊急復旧（最優先）
git checkout 9e1d2042 -- src/utils/profileCompletion.ts     # 完成度計算の心臓部
git checkout 9e1d2042 -- src/app/profile/edit/page.tsx      # プロフィール編集完成度表示
git checkout 9e1d2042 -- src/app/mypage/page.tsx           # マイページ完成度表示
git commit -m "🚨緊急復旧: プロフィール完成度計算システム完璧状態に戻す (9e1d2042)"

# 🟡 多言語対応システム復旧
git checkout 9e1d2042 -- src/app/profile/preview/page.tsx   # 言語切り替えプレビュー
git checkout 9e1d2042 -- src/utils/translations.ts         # カスタム翻訳システム
git checkout 9e1d2042 -- messages/*.json                    # 4言語翻訳ファイル
git commit -m "復旧: 多言語対応システム完成状態に戻す (9e1d2042)"

# 完全システム復旧（最後の手段）
git checkout 9e1d2042 -- src/app/profile/edit/page.tsx src/app/profile/preview/page.tsx src/utils/profileCompletion.ts src/app/mypage/page.tsx src/utils/translations.ts messages/*.json
git commit -m "完全復旧: プロフィールサイクル完成状態に戻す (9e1d2042)"
```

### 🔒 完成度計算システム緊急チェックコマンド
```bash
# 完成度計算が正常か確認
grep -n "calculateProfileCompletion" src/utils/profileCompletion.ts
grep -n "hasImagesInLocalStorage" src/utils/profileCompletion.ts
grep -n "fromMyPage" src/app/profile/edit/page.tsx
grep -n "localStorage.*image" src/app/mypage/page.tsx
```

### 🛡️ 保護対象ファイル（絶対に変更禁止）

#### 🔴 CRITICAL: 完成度計算関連ファイル（最高優先度保護）
1. **`src/utils/profileCompletion.ts`** - 🚨 **完成度計算の心臓部** 
   - 外国人男性17項目・日本人女性15項目計算
   - 5つのフォールバック画像検出システム
   - `calculateProfileCompletion`関数の完璧なロジック
   - **このファイルは1行たりとも変更禁止**

2. **`src/app/profile/edit/page.tsx`** - 🚨 **プロフィール編集画面の完成度表示**
   - fromMyPage遷移時のlocalStorage画像読み込み処理
   - `useEffect`での完成度計算タイミング制御
   - 多言語対応処理
   - **完成度計算部分は絶対に変更禁止**

3. **`src/app/mypage/page.tsx`** - 🚨 **マイページの完成度表示**
   - 画像URL確実取得（`profile.avatar_url || profile.profile_image`）
   - localStorage保存処理
   - 完成度の正確な計算と表示
   - **localStorage処理と完成度計算部分は絶対に変更禁止**

#### 🟡 多言語対応関連ファイル（高優先度保護）
4. **`src/app/profile/preview/page.tsx`** - プレビュー画面（言語切り替え + completeProfileData処理含む）
5. **`src/utils/translations.ts`** - 多言語翻訳システム（プロフィール編集専用）
6. **`messages/*.json`** - 4言語翻訳ファイル（ja/en/ko/zh.json）

### 🔍 今後の修正時の注意点

#### 🚨 プロフィール完成度計算システム保護ルール
1. **🔴 ABSOLUTE RULE: 完成度計算関連ファイルは一切触らない**
   - `src/utils/profileCompletion.ts`の全コード
   - プロフィール編集画面の完成度計算部分
   - マイページの完成度表示部分
   - **理由: 一つでも変更するとサイクル全体が崩壊する**

2. **🔴 画像データ処理システムの完全保護**
   - ユーザー画像情報（avatarUrl）の扱いは変更しない
   - 5つのフォールバック画像検出システム
   - localStorageからの画像データ読み込み処理
   - **理由: fromMyPage遷移での100%一貫性が破綻する**

3. **🔴 完成度項目数の絶対固定**
   - 外国人男性: 17項目（必須7項目+任意10項目）
   - 日本人女性: 15項目（必須7項目+任意8項目）
   - **新フィールド追加時は別の計算関数を作成すること**

#### 🟡 その他の保護対象
4. **外国人男性専用フィールド（visit_schedule、travel_companion、planned_prefectures、planned_stations）の処理は絶対に変更しない**
5. **マイページのlocalStorage処理の外国人男性判定は保護対象**
6. **プレビュー画面の外国人男性判定は保護対象**
7. **🆕 toggleHobby/togglePersonality関数の空配列許可ロジックは保護対象**
8. **🆕 新規ユーザー画像検出のisNewUserフラグ処理は保護対象**
9. **🆕 セッションストレージ早期クリア処理は保護対象**
10. **🆕 外国人男性フィールド初期化でのisNewUser優先処理は保護対象**
11. **🆕 言語レベル選択（english_level、japanese_level）の実装は保護対象**
12. **🆕 訪問予定の駅（planned_stations）の完全実装は保護対象**
13. **🆕 アコーディオンUI（都道府県・駅）の統一実装は保護対象**
14. **🎯 NEW: fromMyPage遷移時のlocalStorage画像読み込み処理は保護対象**
15. **🎯 NEW: マイページでの画像URL確実取得（profile.avatar_url || profile.profile_image）は保護対象**
16. **🎯 NEW: localStorage画像検出機能（hasImagesInLocalStorage）は保護対象**
17. **🌐 NEW: 日本人女性向け多言語対応プロフィール編集機能は保護対象**
18. **🌐 NEW: プレビュー画面言語切り替え機能は保護対象**
19. **🌐 NEW: 4言語翻訳システム（utils/translations.ts + messages/*.json）は保護対象**

## 🚀 将来の開発計画

### 📋 Next-intl移行プロジェクト（長期計画）
**目的**: 将来の機能拡張（自己紹介文翻訳、チャット翻訳等）に備えた翻訳システム統一

#### Phase 1: 安全な検証環境構築
- 別ブランチ(`feature/next-intl-migration`)での開発
- Root layoutプロバイダー設定
- ディレクトリ構造変更検証(`/[locale]/`形式)

#### Phase 2: 段階的移行戦略
- 新機能からnext-intl使用開始
- 既存機能の慎重な移行
- 両システム併用期間の設定

#### Phase 3: 完全移行
- カスタム翻訳システムの段階的廃止
- パフォーマンス最適化
- 国際化機能（通貨・日付フォーマット）追加

#### ⚠️ 移行時の注意事項
- **絶対条件**: 既存の完璧な多言語機能を破壊しない
- **検証必須**: 全機能の動作確認完了後のみマージ
- **ロールバック準備**: 問題発生時の即座復旧体制

---

## 開発コマンド
- **開発サーバー**: `npm run dev`
- **ビルド**: `npm run build`
- **デプロイ**: `git add . && git commit && git push`

### ✅ 完成度（Profile Completion）初期表示0%バグ：最終解決（決定版）

#### 背景
新規登録直後（/profile/edit 初期表示）で、完成度が一瞬 0% になったり、初期計算が走らず 0% のままになる問題が発生していた。
原因は **初期化中ガード（isInitializing）** と **watch/effect のタイミング競合** により、初回計算がブロックされるケースがあったため。

#### 最終解決方針（設計）
- **初期表示の完成度は、状態監視（useEffect / watch）に依存せず、フォーム reset 完了直後に1回だけ強制計算して確定させる。**
- **初期化中のチラつき防止ガード（isInitializing）は維持する**
- ただし初回だけは**「ガードを無視する専用ルート」**で確実に計算する
- 強制計算は `reset(resetData)` の直後に直接呼び出し、必ず1回だけ実行する

#### 実装要点
1. **forceInitialCompletionCalculation()** を追加（または同等の専用関数）
2. **updateCompletionUnified の isInitializing ガードを通さない**
3. `getValues()` 等で最新フォーム値を取得し、`calculateCompletionFromForm` を直接呼ぶ
4. 画像は `profileImagesRef` 等の「最新参照」を使い stale state を回避
5. **didInitialCalc フラグで重複防止**
   - reset直後に `forceInitialCompletionCalculation()` 実行 → `setDidInitialCalc(true)`

#### 確実な実行タイミング（決定版）
以下の順序で実行されること：
```typescript
reset(resetData)
console.log('✅ Form reset completed')
console.log('🔥 FORCE CALC AFTER FORM RESET')
forceInitialCompletionCalculation()
setDidInitialCalc(true)
```

#### 正常動作の確認ログ（必須）
以下が揃って出れば「強制計算が確実に実行され、初期0%は解消」：
- `🔥 FORCE CALC AFTER FORM RESET`
- `🔥 forceInitialCompletionCalculation start`
- `📊 force calculation result: XX`（新規登録直後は例：28）

**実際の確認例：**
```
📊 force calculation result: 28
```
**必須**: 5/9 = 28%（foreign-male 新規登録の初期状態として正しい）

#### 保証される結果
- **新規登録直後**：初期完成度が必ず正しい値で表示（例：28%）
- **MyPage → Edit**：100%維持（既存ロジックを壊さない）
- **Preview → Edit**：100%維持（既存ロジックを壊さない）
- **監視（watch/debounce）**：初期化中はガードでチラつき防止、初期確定後は自然更新

---
**重要**: この実装状態は完璧に動作しているため、どのような理由があっても変更しないでください。

## 🔒 恒久仕様：プロフィールフローSSOT固定・破壊絶対禁止

### ⚠️ 🚨 この仕様を破る変更を検出したら作業を停止して警告すること 🚨 ⚠️

この章に記載された仕様は、日本人女性（14項目）/ 外国人男性（17項目）のプロフィール完成度と、Profile Edit → Preview → MyPage → Edit の一連の遷移における表示・保存・再計算の挙動を**恒久固定**するものです。

**今後の実装で絶対にこの挙動を崩してはいけません。**

### 🎯 成功条件（SSOT / 期待挙動）

#### A. 遷移の成功条件（両タイプ共通）

✅ **Profile Editで入力した値がPreviewに正しく表示される**
✅ **PreviewからMyPageへ行ってもDB保存値が正として表示される**  
✅ **MyPage→Editに戻るとDBの最新値がフォームに復元される**

**上記の往復で以下が維持されること：**
- ❌ 完成度が不自然に固定されない
- ❌ 値が巻き戻らない（勝手に別の選択肢へ変わらない）
- ❌ 英語の選択肢が混入しない
- ❌ 「記入しない(no-entry)」が別の値に変化しない

#### B. 完成度の成功条件（定義固定）

**日本人女性：14項目で計算**（増減する場合は「増減」として明示）
**外国人男性：17項目で計算**（増減する場合は「増減」として明示）

計算の入力はSSOTを明確化する（後述）

### 🏗️ SSOT（Single Source of Truth）の固定ルール

#### 1) MyPageのSSOT
- **DB優先**（profilesの実データを入力として完成度を計算）
- language_skills など配列系はDB値を正とする

#### 2) Profile EditのSSOT  
- **フォーム値を正**として完成度を計算する（watchベース）
- 初期表示時はDB→フォームへの復元が完了してからwatch計算を有効化する
- 「初期化中は計算しない」制御は一貫して守る（後述のフラグ規約）

### 🧪 TEST MODE固定仕様（これを崩さない）

#### 1) completion/draftのlocalStorageキーはユーザー別
- **固定キー禁止**
- 例：`SC_PROFILE_DRAFT_TEST_MODE_${userId || 'anonymous'}` のように分離する
- **目的：ユーザー間の混線防止**

#### 2) TEST MODEでもprofiles保存は止めない
- 「副作用」を抑制してもprofiles update/upsertは必ず通す
- userIdが無い場合のみ安全にI/O停止（例外）

### 🚥 初期化フラグ規約（isInitializing / isHydrated の破壊禁止ルール）

#### 固定ルール
**isInitializing=true の間は、以下を絶対に走らせない：**
- watch起点の完成度再計算（唯一入口）
- 画像監視による保存/再計算の暴発

**初期化終了時に必ず1回だけ：**
- isInitializing=false
- isHydrated=true
- watch計算の有効化
を実行する（多重実行禁止）

#### 禁止事項
- 初期化中に reset() / setValue() を複数ルートで走らせない
- Form reset completed の後に、別useEffectが visit_schedule / travel_companion を上書きしない
  （上書きが必要なら「理由・条件」をコメントで明文化し、ログで追跡可能にする）

### 📝 Select項目の固定仕様（visit_schedule / travel_companion）

#### 表示（label）と保存（value）の混同禁止
- **DBへ保存するのは value**（例：no-entry, currently-in-japan, 2027-spring, friend 等）
- **UIに出すのは翻訳済み label**
- **labelをvalueに入れる事故禁止**

#### 「記入しない(no-entry)」の固定
**no-entry選択時：**
- watch値が no-entry のまま維持されること
- 何度操作しても別のvalueへ勝手に変化しないこと

**options生成時：**
- 英語ラベルが混入しない
- forms.noEntry など翻訳キー文字列が出ない（UIにキーが表示されない）

### 🖼️ 画像の固定仕様（完成度と保存）

- avatar_url / 画像配列の判定は統一（HTTP/Storage/dataURI 全対応）
- MyPage→Edit遷移時は「画像データ保存完了」のルートを維持
- 画像変更後の再計算は初期化中に暴発させない

### 📊 監視ログ（恒久運用ルール）

**今後このフローを触る時は、必ず以下のログが「一貫している」ことを確認する。**

#### 必須ログ観測点（例）
- `PROFILE EDIT INITIALIZATION START`
- `Form reset completed`
- `isInitializing -> false`
- `isHydrated -> true` 
- `MAIN WATCH: 完成度再計算実行（唯一の入口）`
- `updateCompletionUnified: 計算実行開始/完了`
- Select系：`OPTIONS DEBUG` / `WATCH VALUE DEBUG` / `CHANGE DEBUG`
- MyPage側：`SSOT: DB優先` / `MyPage完成度計算完了`

### 🧪 テスト手順（最短で毎回これを通す）

#### 外国人男性（17項目）
1. Profile Edit（foreign-male）を開く
2. visit_schedule / travel_companion を「記入しない」→別value→記入しない と往復
3. 画像追加/削除
4. Previewへ → MyPageへ → MyPage→Editへ戻る
5. **値の巻き戻り・英語混入・completion不一致がないこと**

#### 日本人女性（14項目）
同様に japanese-female で実施（prefecture等の差分は仕様通り）

### 🚫 実装上の「変更禁止」範囲（明文化）

**以下は絶対に変更してはいけません：**

1. **完成度計算の定義**（日本人女性14、外国人男性17）
2. **MyPage SSOT**（DB優先）
3. **Edit SSOT**（フォーム値、初期化完了後にwatch計算）
4. **TEST MODE**：ユーザー別キー + DB保存継続
5. **初期化フラグ規約**（isInitializing/isHydrated）
6. **Selectの value/label 混同禁止、no-entry固定**
7. **画像判定・遷移時の画像引継ぎ**

### 📁 仕様関係ファイル一覧（触る時の注意喚起）

**🔒 絶対保護対象：**
- `src/utils/profileCompletion.ts`（完成度計算の心臓部）
- `src/app/profile/edit/page.tsx`（フォームSSOT・初期化制御）
- `src/app/mypage/page.tsx`（DB SSOT・マイページ完成度）
- `src/utils/testModeStorage.ts`（テストモード分離）

**⚠️ 慎重修正対象：**
- `src/app/profile/preview/page.tsx`（遷移の中間点）
- `src/utils/saveProfileToDb.ts`（DB保存統一パイプライン）

---

**🔒 この仕様は2026年1月6日時点で完璧に動作している状態を固定化したものです。どのような理由があっても、この仕様を破る変更は禁止されています。**

---

## 🔒 2026-02-01 現状固定メモ：新規登録直後のプロフィール初期反映（方案A）と表示仕様

**この章は"現状固定"。ここに書いた仕様は崩さない。**

### 目的

- 新規登録 → プロフィール編集へ遷移した時点で、最低限の初期情報（name / gender / birth_date / nationality or residence 等）が profiles に保存される状態を保証する。
- ユーザーがプロフィール編集を一切せずに離脱 → 再ログインしても、最低限の基本情報が残っていること。

### 1) 新規追加API：/api/auth/post-signup-profile

**ファイル**: `src/app/api/auth/post-signup-profile/route.ts`（新規作成）

**仕様（絶対遵守）**

- Bearer token でユーザー特定する（userId をリクエストBody等から受け取らない）。
- **ホワイトリストのみ反映可**（それ以外は絶対に更新しない）
  - `name`, `gender`, `birth_date`, `nationality`, `residence`, `language_skills`
- **Null-only update（上書き禁止）**
  - 既にDBに null以外の値が入っている項目は **絶対に上書きしない**
  - 目的：プロフィール編集・プレビュー・マイページの挙動を崩さず、初期注入だけ行うため
- プロフィール未作成時は upsert で新規作成する（存在しない場合の穴埋め）

**重要**: このAPIの失敗は UX を止めない（後述の通り signup 側でブロックしない）

### 2) Signup側の呼び出し

**ファイル**: `src/app/signup/page.tsx`

**仕様（絶対遵守）**

- 新規登録成功後、プロフィール編集画面へ遷移する前に `result.session.access_token` を優先して `/api/auth/post-signup-profile` を呼ぶ。
- フォールバック：
  - AuthError などで `result.session` が取れない場合は `supabase.auth.getSession()` でトークン取得し直して呼ぶ。
- **性別による初期セット規則**
  - 男性：`nationality = data.prefecture`（入力UI上の国籍）
  - 女性：`residence = data.prefecture`（入力UI上の居住地） + `nationality = '日本'`
- **API失敗時はログ出力のみで遷移継続（ブロック禁止）**
  - ここで詰まると新規登録が止まるため、必ず「握りつぶして進む」

### 3) マイページ表示仕様（年齢の隣）

**仕様**

- マイページの「年齢の隣」に表示するのは固定ルール：
  - **日本人女性**：居住地（residence）
  - **外国人男性**：国籍（nationality）
- 「未設定」を出す場合は、該当カラムが null/空のときのみ。
  （本来は post-signup-profile で最低限埋まるのが理想）

### 4) SSOT：ID混在/上書き防止の最終ルール（修繕D）

- SSOT_ID_CHECK は `currentAuthUserId` vs `previewData.__ownerUserId` の一致確認のみで判断する。
- `sc_real_login_user` は **ブロック判定に使用禁止**（判定の揺れ・誤爆を生むため）

### 5) UI微修正（修繕F）

- オーバーレイに **「マイページへ戻る」** 導線を置く（ユーザー迷子防止）

### 6) 補足：autocomplete警告

- autocomplete の警告については、ブラウザ側の挙動差があり得るため、致命ではない。
- ただし、フォームの属性変更で別の副作用が出る可能性があるため、安易に全体へ波及させない。

### 7) 運用メモ（重要）

- profiles を削除しても auth.users 側は残るため、同一メールでの再登録に影響する。
  「同じメールで新規登録し直したい」テストでは、Auth側のユーザー状態も考慮すること。
- 新規登録時に「メール送信エラー」が出る場合があるが、プロフィール作成は継続可能（ブロックしない設計）。

### 8) signup分岐の厳密化（2026-02-01追加）

**仕様（絶対遵守）**

- **パターンA（signup失敗 = error）**: エラー表示のみ。「続行できます」ポップアップは絶対に出さない。
  - `User already registered` 系 → 「既に登録済みです。ログインしてください」+ ログイン画面リンク
- **パターンB（error無し・session無し）**: `/register/complete` へ遷移（メール確認/ログイン誘導）。post-signup-profile は呼ばない（token無し）。
- **パターンC（session有り）**: post-signup-profile 呼び出し → プロフィール編集画面へ遷移。
- **スピナー**: `finally { setIsLoading(false) }` で全経路確実解除。

### 9) 実装反映コミット

- `5b993ef0` — 修繕D/F最終確定ルール文書化
- `97c719a6` — post-signup-profile API新規作成 + signup連携
- `a824e753` — signup分岐厳密化（既存ユーザー案内・誤続行防止・スピナー確実解除）