# 桜クラブ - プロジェクト状況仕様書

## 📋 プロジェクト概要

**プロジェクト名**: 桜クラブ (Sakura Club)  
**種類**: 日本人女性と外国人男性のマッチングアプリ  
**技術スタック**: Next.js 14.2.31 + TypeScript + Supabase + Tailwind CSS  
**最終更新**: 2025-09-24T21:21:32

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

---

**作成者**: Claude Code Assistant
**作成日時**: 2025-09-24T21:30:00
**最終更新**: 2026-02-01
**プロジェクト状況**: 安定稼働中（課題あり） ⚠️