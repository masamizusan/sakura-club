# 桜クラブ - プロジェクト状況仕様書

## 📋 プロジェクト概要

**プロジェクト名**: 桜クラブ (Sakura Club)  
**種類**: 日本人女性と外国人男性のマッチングアプリ  
**技術スタック**: Next.js 14.2.31 + TypeScript + Supabase + Tailwind CSS  
**最終更新**: 2025-09-24T21:21:32

## 🔒 指標A: profile_initialized によるログイン後遷移制御（2026-02-02実装）

### 仕様
- `profiles.profile_initialized` (boolean, default false) でプロフィール完成状態を管理
- プレビュー確定保存時に `profile_initialized = true` をセット
- ログイン後: `profile_initialized === true` → `/mypage`、それ以外 → `/profile/edit`
- `post-signup-profile` API では `profile_initialized` を絶対に true にしない
- バックフィル: name と bio が両方入っている既存ユーザーは `profile_initialized = true`

### 変更ファイル
- `supabase/migrations/20260202_add_profile_initialized.sql` — カラム追加+バックフィル
- `src/app/profile/preview/page.tsx` — upsertPayload に `profile_initialized: true`
- `src/app/login/page.tsx` — ログイン後遷移判定
- `src/app/api/auth/post-signup-profile/route.ts` — コメント追記

---

## 🐛 fromMyPage クエリ結合バグ修正（2026-02-02）

- **不具合原因**: `createLanguageAwareUrl` が既存クエリ付きパスに `?lang=ja` を二重付与し、`fromMyPage=true?lang=ja` となって `fromMyPage` が認識されなかった。結果、既存ユーザーが新規扱い分岐に入りニックネーム等が空になった。
- **対策**: URL生成を `URL` オブジェクト + `URLSearchParams` に統一し、クエリパラメータを正しくマージするよう修正。
- **変更ファイル**: `src/utils/languageNavigation.ts`

---

## 🎯 直近の作業内容と成果

### 完了済みタスク
1. ✅ **デプロイエラー修正** (2025-09-24)
   - JSX構文エラーの完全解決
   - ProfileEditContent関数の構造化
   - 浮遊return文の除去

2. ✅ **プロフィール編集ページ完全復元** (2025-09-24)
   - 全機能の日本語UI実装
   - TypeScript型安全性の確保
   - レスポンシブデザイン対応

3. ✅ **全項目表示実装** (2025-09-24)
   - 外国人男性: 15項目完全実装
   - 日本人女性: 13項目完全実装
   - プロフィール完成度計算の正常化

## 🏗️ アーキテクチャ

### 主要ディレクトリ構造
```
/Users/mizunomasafumi/sakura-club/
├── src/
│   ├── app/
│   │   ├── profile/edit/page.tsx        # メイン作業ファイル
│   │   ├── profile/preview/page.tsx     # プレビュー機能
│   │   ├── mypage/page.tsx              # マイページ
│   │   └── signup/page.tsx              # 新規登録
│   ├── components/
│   │   ├── ui/                          # UI コンポーネント
│   │   ├── auth/AuthGuard.tsx           # 認証ガード
│   │   └── layout/Sidebar.tsx           # サイドバー
│   ├── lib/
│   │   ├── supabase.ts                  # DB接続
│   │   └── auth.ts                      # 認証サービス
│   └── store/
│       └── authStore.ts                 # 状態管理
├── package.json                         # 依存関係
├── next.config.js                       # Next.js設定
└── tailwind.config.js                   # Tailwind設定
```

### データベース (Supabase)
- **URL**: https://zrdzyzphrubeaafbkjtr.supabase.co
- **主要テーブル**: profiles, auth.users
- **認証**: Supabase Auth使用

## 🔧 プロフィール編集システム詳細

### ファイル: `/src/app/profile/edit/page.tsx` (2,827行)

#### 主要コンポーネント構造
```typescript
// メインエクスポート
export default function ProfileEditPage() {
  // エラー状態のUI処理
  return <AuthGuard><ProfileEditContent /></AuthGuard>
}

// メインコンテンツ (line 190-2558)
function ProfileEditContent() {
  // 条件付きレンダリング:
  // 1. ローディング状態 (userLoading)
  // 2. エラー状態 (error)  
  // 3. メインプロフィール編集UI
}
```

#### フォーム項目定義

**外国人男性 (15項目)**
1. プロフィール画像 (最大3枚)
2. 自己紹介文 (100-1000文字) *必須*
3. ニックネーム *必須*
4. 国籍 *必須*
5. 職業
6. 身長 (120-250cm)
7. 体型
8. 結婚状況
9. 生年月日 (読み取り専用)
10. 年齢 (自動計算)
11. 行く予定の都道府県 (最大3つ) *必須*
12. 訪問予定時期 *必須*
13. 同行者 *必須*
14. 学びたい日本文化 (1-8つ) *必須*
15. 性格 (最大5つ)

**日本人女性 (13項目)**
1. プロフィール画像 (最大3枚)
2. 自己紹介文 (100-1000文字) *必須*
3. ニックネーム *必須*
4. 職業
5. 身長 (120-250cm)
6. 体型
7. 結婚状況
8. 生年月日 (読み取り専用)
9. 年齢 (自動計算)
10. 都道府県 *必須*
11. 市区町村
12. 共有したい日本文化 (1-8つ) *必須*
13. 性格 (最大5つ)

#### 重要な状態管理
```typescript
// フォーム関連
const { register, handleSubmit, setValue, watch, getValues, formState: { errors } } = useForm()

// 選択状態管理
const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
const [selectedPersonality, setSelectedPersonality] = useState<string[]>([])
const [selectedPlannedPrefectures, setSelectedPlannedPrefectures] = useState<string[]>([])

// UI状態
const [profileCompletion, setProfileCompletion] = useState(0)
const [completedItems, setCompletedItems] = useState(0)
const [totalItems, setTotalItems] = useState(0)
const [profileImages, setProfileImages] = useState<Array<ImageData>>([])
```

#### 重要な関数
```typescript
// プロフィール完成度計算 (line 278-449)
const calculateProfileCompletion = useCallback((profileData: any, imageArray?: Array<...>) => {
  // 外国人男性: 15項目、日本人女性: 13項目での計算
})

// ハンドラ関数
const toggleHobby = (hobby: string) => { /* 趣味選択 */ }
const togglePersonality = (trait: string) => { /* 性格選択 */ }  
const togglePlannedPrefecture = (prefecture: string) => { /* 都道府県選択 */ }
const handleImagesChange = (images: Array<...>) => { /* 画像管理 */ }
```

## 🎨 UI/UX仕様

### デザインシステム
- **カラーパレット**: Sakura theme (sakura-50 to sakura-700)
- **グリッドシステム**: Tailwind CSS Grid
- **レスポンシブ**: Mobile-first design
- **コンポーネント**: Radix UI + shadcn/ui

### レイアウト構造
```
┌─────────────────────────────────────┐
│ Sidebar (デスクトップのみ)            │
├─────────────────────────────────────┤
│ Header (戻るボタン + タイトル)        │
├─────────────────────────────────────┤
│ エラー表示エリア                     │
├─────────────────────────────────────┤
│ プロフィール完成度バー               │
├─────────────────────────────────────┤
│ フォーム本体                         │
│ ├─ プロフィール画像                 │
│ ├─ 基本情報セクション               │
│ ├─ 詳細情報セクション               │
│ ├─ 条件付き専用セクション           │
│ ├─ 日本文化・趣味セクション         │
│ ├─ 性格セクション                   │
│ ├─ プレビューボタン                 │
│ └─ 保存ボタン                       │
└─────────────────────────────────────┘
```

## 🔄 データフロー

### 初期化フロー
1. `useAuth()` でユーザー認証確認
2. URL パラメータから `type` 取得 (`foreign-male` | `japanese-female`)
3. `secureProfileInitialization()` でプロフィール初期化
4. `calculateProfileCompletion()` で完成度計算

### 保存フロー  
1. フォームデータ収集 (`watch()`)
2. 画像アップロード処理
3. interests配列の統合 (hobbies + personality + custom_culture)
4. Supabase へのデータ更新
5. 成功時の状態更新

### プレビューフロー
1. 現在のフォームデータを `sessionStorage` に保存
2. `/profile/preview` を新しいウィンドウで開く
3. プレビュー画面でデータ表示
4. 「更新する」ボタンで保存実行

## 🛠️ 開発環境

### 必要なコマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド (本番用)
npm run build
npm run build-local  # 簡易ビルド

# 型チェック
npm run type-check

# リント
npm run lint
```

### 重要な環境変数
```env
NEXT_PUBLIC_SUPABASE_URL=https://zrdzyzphrubeaafbkjtr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

## 🚨 重要な注意点

### 1. JSX構造の維持
- `ProfileEditContent` 関数 (line 190) は単一のreturn文のみ
- 条件付きレンダリングは `{condition && <Component />}` で実装
- 浮遊するreturn文やJSX要素は絶対に作らない

### 2. 型安全性
- `marital_status` は `'none' | 'single' | 'married'` 型
- Select コンポーネントの `onValueChange` では型キャストが必要
- フォームフィールドは全て `register()` で登録

### 3. 状態管理の依存関係
- `selectedHobbies`, `selectedPersonality`, `selectedPlannedPrefectures` は個別管理
- フォーム値の変更時は `setValue()` で同期
- 完成度計算は `useCallback` でメモ化

### 4. ユーザータイプ判定
```typescript
const profileType = searchParams.get('type')
const isForeignMale = profileType === 'foreign-male'  
const isJapaneseFemale = profileType === 'japanese-female'
```

## 📈 パフォーマンス指標

### ビルドサイズ (最新)
- Profile Edit Page: **23.3 kB** (全項目実装後)
- Total Bundle Size: **87.2 kB** (共有チャンク)
- 静的ページ生成: **27ページ**

### 完成度計算精度
- 外国人男性: 15項目中の完成項目数 / 15 × 100%
- 日本人女性: 13項目中の完成項目数 / 13 × 100%

## 🔗 関連ページとの連携

### マイページ (`/mypage`)
- プロフィール完成度表示
- 編集ページへのリンク
- 同じ完成度計算ロジック使用

### プレビューページ (`/profile/preview`)  
- sessionStorage からデータ取得
- 外国人男性専用フィールドの条件表示
- 更新ボタンからの直接保存機能

### 新規登録 (`/signup`)
- 基本情報の収集
- プロフィール編集への遷移パラメータ設定

## 🎯 今後の展開可能性

### 追加機能候補
1. **リアルタイムプレビュー** - フォーム入力と同時にプレビュー更新
2. **プロフィール写真の自動最適化** - WebP変換とリサイズ
3. **多言語対応** - i18n実装で英語UI対応
4. **詳細バリデーション** - より細かい入力チェック
5. **プロフィール下書き保存** - 途中保存機能

### 技術的改善点
1. **Bundle Size最適化** - 動的インポートの活用
2. **SEO改善** - メタデータの最適化
3. **アクセシビリティ** - ARIA属性の追加
4. **エラーハンドリング** - より詳細なエラー分類

## 🚨 現在の課題

### 【優先度：高】プロフィール完成度計算の不一致
**問題**: プロフィール編集画面とマイページでプロフィール完成度の数値が一致しない

**詳細**:
- プロフィール編集ページ: `/src/app/profile/edit/page.tsx` の `calculateProfileCompletion` 関数
- マイページ: `/src/app/mypage/page.tsx` の完成度計算ロジック
- 同じデータを参照しているはずだが、計算結果が異なる

**推定原因**:
1. **完成度計算ロジックの相違**
   - 両ページで異なる計算関数を使用している可能性
   - 必須項目の判定基準が異なる
   - データの取得タイミングや状態の違い

2. **データソースの相違**
   - プロフィール編集: フォーム状態 (`watch()`, `selectedHobbies` など)
   - マイページ: データベースから直接取得したプロフィールデータ
   - 画像データの取得方法の違い

3. **項目カウントの相違**
   - 外国人男性15項目 vs 日本人女性13項目の判定ロジック
   - 条件付き表示項目の計算タイミング
   - カスタム文化やその他項目の扱い

**影響範囲**:
- ユーザー体験の一貫性が損なわれる
- プロフィール完成度の信頼性が低下
- ユーザーの混乱を招く可能性

**修正が必要なファイル**:
```
/src/app/profile/edit/page.tsx (line 278-449: calculateProfileCompletion)
/src/app/mypage/page.tsx (完成度計算部分)
```

**解決方針**:
1. 両ページの計算ロジックを統一
2. 共通の完成度計算関数を作成し、両ページで使用
3. データ取得方法と状態管理の統一
4. テストケースの作成でロジック検証

**緊急度**: 高 - ユーザーエクスペリエンスに直接影響

## 📞 緊急時の対応

### デプロイエラーが発生した場合
1. `git status` で変更内容確認
2. `npx next build` でローカルビルドテスト
3. JSX構文エラーの場合は ProfileEditContent 関数の構造を確認
4. 型エラーの場合は Select コンポーネントの型キャストを確認

### データ不整合が発生した場合
1. `calculateProfileCompletion` 関数の引数確認
2. `selectedHobbies` など状態配列の同期確認  
3. フォーム `setValue` と `watch` の整合性確認

### プロフィール完成度不一致の調査方法
1. 両ページのコンソールログで計算過程を比較
2. `completedItems` と `totalItems` の値を確認
3. 必須項目の判定条件を両ページで比較
4. 画像データの有無とその取得方法を確認

---

## 修繕D/F 最終確定（再発防止ルール）

### 修繕D（根治）— SSOT_ID_CHECK一本化（必須ルール）

- ブロック判定は `supabase.auth.getUser()` で取得した `currentAuthUserId` と、`previewData.__ownerUserId` の一致のみで行う
- `sc_real_login_user`（グローバルlocalStorageキー）はログ出力用の補助情報。**ブロック判定に使用しない（禁止）**
- **理由:** localStorageは別タブ/別ログインで上書きされるため、誤ブロックが発生する。タブ固有のSupabaseセッションを唯一の真実（SSOT）として扱う

### 修繕F（UX）— ブロック後の復帰導線

- ブロック用オーバーレイに **「マイページへ戻る」** ボタンを追加し、詰み状態を防止する

### 補足（任意）

- `/login` で `autocomplete="current-password"` 警告が出る場合があるが、動作影響はない。余裕があればログインフォームに autocomplete を付与して警告を抑制する

### 修繕G（年齢のDB反映＆表示の安定化）— 2026-02-02

- `POST /api/auth/post-signup-profile` で `birth_date` が有効なら **サーバ側で age を算出**し、`profiles.age` を Null-only update で補完する。
- 年齢算出は「今日の日付」と birth_date の月日比較で減算する一般的な方式（日付ベース、TZ非依存）。
- **UIフォールバック（マイページ）**: `profile.age` が存在すればそれを使う → null なら `birth_date` から算出して表示 → それも無ければ「未設定」。
- 変更ファイル:
  - `src/app/api/auth/post-signup-profile/route.ts` — `calculateAgeFromBirthDate()` 追加、age null-only update
  - `src/app/mypage/page.tsx` — 年齢表示で birth_date フォールバック

### 修繕H（再ログイン時の必須項目欠落ガード）— 2026-02-02

- `/mypage` でプロフィール読み込み後、**必須項目が欠落している場合は `/profile/edit` へリダイレクト**する。
- 必須チェック項目:
  - `name`
  - `gender`
  - `birth_date`
  - 外国人男性: `nationality`
  - 日本人女性: `residence` または `prefecture`
- 目的: 「新規登録→未編集離脱→再ログイン」で /mypage に入れてしまう穴を塞ぎ、データ欠損を防ぐ。
- 変更ファイル: `src/app/mypage/page.tsx` — loadProfile 内に必須欠落ガード追加

---

## 🔐 マルチタブ認証制御（2026-02-22 完了）

### 設計方針
- 同一ブラウザ内では「最後にログインしたユーザーに統一」を正とする
- ユーザー不一致（incoming !== base）が発生した場合のみ通知

### 挙動

| 状態 | 動作 |
|------|------|
| PASSIVE（裏タブ） | alert → reload（1回のみ） |
| ACTIVE（前面） | 非ブロッキングバナー表示 |
| incoming === base | 何もしない（SKIP_SAME_USER） |

### 安全機構
- **alertLock（TTL）**: 10秒間の連続 alert 防止
- **reloadGuard**: 8秒間の連続 reload 防止
- **postReloadSync**: reload 後の base 収束トランザクション
- **SKIP理由ログ完備**: SKIP_SAME_USER, SKIP_ALERT_LOCK, SKIP_GUARD_ACTIVE 等

### デバッグ
- `?debugAuth=1` で Auth Debug Panel 表示
- SKIP理由ログで原因特定可能
- Copy JSON でスナップショット+ログ一括取得

### 変更ファイル
- `src/store/authStore.ts` — ACTIVE/PASSIVE 分岐、Banner State、SKIP ログ
- `src/components/auth/AuthSwitchBanner.tsx` — バナー UI（新規作成）
- `src/components/auth/AuthDebugPanel.tsx` — Debug Panel 拡張
- `src/app/layout.tsx` — AuthSwitchBanner 追加

### 現状評価
- ✅ 無限ループ解消済み
- ✅ クロスタブ通知安定
- ✅ 収束処理正常
- ✅ **実運用可能状態**

---

**作成者**: Claude Code Assistant
**作成日時**: 2025-09-24T21:30:00
**最終更新**: 2026-02-22
**プロジェクト状況**: 安定稼働中 ✅