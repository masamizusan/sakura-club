# Sakura Club 🌸

文化体験を通じた真の出会いを提供する、安心・安全なマッチングプラットフォーム

*Vercel デプロイメント - 全コンポーネント含有確認済み + 無限リダイレクトループ修正済み*

### 🔧 デプロイメントステータス
- ✅ 必須コンポーネント: button.tsx, AuthGuard.tsx, authStore.ts, utils.ts
- ✅ Package.json Node.js バージョン要件
- ✅ 全ファイルが最新コミットに含まれていることを確認済み
- ✅ Vercel固有の環境問題対策: next.config.js更新、キャッシュバスター、ビルドスクリプト最適化

## 🎯 プロジェクト概要

Sakura Clubは、訪日外国人男性と日本人女性が茶道・書道・料理教室などの文化体験を通じて自然な出会いを楽しめる、健全で信頼性の高いWebプラットフォームです。

### 主な特徴
- 📚 **文化体験中心**: 茶道、書道、料理など本格的な日本文化体験
- 🔒 **安心・安全**: 本人確認と審査制による安全な環境
- 🚫 **金銭取引禁止**: 健全な文化交流のみを目的
- 🌍 **多言語対応**: 日本語・英語完全サポート
- 📱 **レスポンシブ**: モバイル・デスクトップ対応

## 🛠 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Tailwind CSS** + shadcn/ui
- **React Hook Form** + Zod validation
- **Lucide React** (アイコン)

### バックエンド・認証
- **NextAuth.js** (認証)
- **Supabase** (データベース・リアルタイム機能)
- **Zustand** (状態管理)

### 開発ツール
- **TypeScript**
- **ESLint**
- **PostCSS**
- **Autoprefixer**

## 📁 プロジェクト構造

```
sakura-club/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── page.tsx           # トップページ
│   │   ├── signup/            # 会員登録
│   │   ├── login/             # ログイン
│   │   ├── dashboard/         # ダッシュボード
│   │   └── layout.tsx         # ルートレイアウト
│   ├── components/
│   │   ├── ui/                # 再利用可能UIコンポーネント
│   │   ├── layout/            # レイアウトコンポーネント
│   │   └── sections/          # ページセクションコンポーネント
│   └── lib/
│       ├── validations/       # Zodバリデーションスキーマ
│       └── utils.ts           # ユーティリティ関数
├── public/                     # 静的ファイル
├── tailwind.config.js         # Tailwind設定
├── tsconfig.json             # TypeScript設定
└── package.json              # 依存関係
```

## 🚀 セットアップ

### 1. リポジトリのクローン
```bash
git clone [repository-url]
cd sakura-club
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
```bash
cp .env.example .env.local
```

`.env.local`ファイルを編集して、必要な環境変数を設定してください：

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Sakura Club"
```

### 4. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 📄 実装済み機能

### ✅ 完了済み
1. **技術スタックの選定と詳細設計**
2. **ディレクトリ構成の提案**
3. **トップページのUIとコード実装**
   - ヒーローセクション
   - 特徴説明セクション
   - CTA (Call to Action)
4. **会員登録・ログイン機能の設計と実装**
   - 会員登録ページ (`/signup`)
   - ログインページ (`/login`)
   - フォームバリデーション
   - レスポンシブデザイン
5. **ダッシュボードページの実装**
   - マッチング機能UI
   - 文化体験予約UI
   - メッセージ機能UI

### 🔄 次のステップ
1. **データベーススキーマの設計**
2. **実際の認証処理の実装**
3. **プロフィール管理機能**
4. **マッチング アルゴリズム**
5. **リアルタイムチャット機能**
6. **文化体験予約システム**

## 🎨 デザインシステム

### カラーパレット
- **Sakura Primary**: `#B91C1C` (桜の赤)
- **Sakura Gradient**: `#fef7f7` → `#fee2e2` → `#fecaca`
- **安全な緑**: 審査制・安全性を表現
- **文化の青**: 国際交流を表現

### コンポーネント
- Button (複数バリアント)
- Input / Textarea
- Select (Radix UI ベース)
- Typography システム

## 📱 レスポンシブ対応

- **モバイル**: 375px〜
- **タブレット**: 768px〜
- **デスクトップ**: 1024px〜
- **大画面**: 1280px〜

## 🔒 セキュリティ機能

- パスワード強度チェック
- 入力値サニタイゼーション
- CSRF保護 (NextAuth.js)
- 本人確認機能 (予定)
- コンテンツモデレーション (予定)

## 🌍 多言語対応

- 日本語 (メイン)
- 英語 (サブ)
- i18n設定済み (next-i18next)

## 🧪 テスト

```bash
npm run test    # テスト実行 (予定)
npm run lint    # ESLint実行
npm run build   # 本番ビルド
```

## 🚢 デプロイ

```bash
npm run build
npm run start
```

推奨デプロイ先：
- **Vercel** (Next.js最適化)
- **Netlify** 
- **AWS Amplify**

## 📞 サポート

プロジェクトに関する質問や提案がありましたら、Issue を作成してください。

---

**🌸 Sakura Club - 文化体験を通じた真の出会い 🌸**