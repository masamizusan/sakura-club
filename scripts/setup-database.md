# Supabaseデータベースセットアップ手順

## 1. Supabase プロジェクトの設定

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. プロジェクトを選択
3. 左サイドバーから **SQL Editor** を選択

## 2. データベーススキーマの作成

`supabase/migrations/001_initial_schema.sql` の内容をSQLエディタにコピー＆ペーストして実行してください。

## 3. 認証設定

### 3.1 Email認証の設定
1. **Authentication** → **Settings** を選択
2. **Email Auth** で以下を設定：
   - Enable email confirmations: `オン`
   - Enable email change confirmations: `オン`
   - Secure email change: `オン`

### 3.2 URLの設定
1. **Site URL**: `http://localhost:3000` (開発時)
2. **Redirect URLs** に以下を追加：
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/dashboard`

### 3.3 Email Templates
必要に応じて、認証メールのテンプレートをカスタマイズ可能

## 4. RLSポリシーの確認

スキーマ作成後、以下のポリシーが設定されているか確認：

### Profiles テーブル
- ✅ 全ユーザーがプロフィールを閲覧可能
- ✅ 自分のプロフィールのみ更新可能
- ✅ 自分のプロフィールのみ作成可能

### Matches テーブル
- ✅ 関連するマッチのみ閲覧可能
- ✅ マッチの作成・更新が適切に制限

### その他のテーブル
- ✅ Experience関連のポリシー
- ✅ Message関連のポリシー

## 5. テストデータの挿入（オプション）

開発用のテストデータを挿入する場合：

```sql
-- サンプルプロフィール（実際のauth.usersと連携が必要）
-- 実際のアプリケーションでサインアップ後に作成されます
```

## 6. 環境変数の確認

`.env.local` ファイルに以下が設定されているか確認：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 7. 動作確認

1. アプリケーションを起動: `npm run dev`
2. ブラウザで `http://localhost:3000` にアクセス
3. 新規登録ページで会員登録を試す
4. メール確認後、ログインを試す
5. ダッシュボードにアクセスできることを確認

## トラブルシューティング

### よくある問題

1. **RLS Policy エラー**
   - 各テーブルのRLSポリシーが正しく設定されているか確認
   - auth.uid() が正しく動作しているか確認

2. **メール送信の問題**
   - SMTP設定を確認（プロダクションの場合）
   - Spam フォルダを確認

3. **CORS エラー**
   - Supabase の URL 設定を確認
   - 環境変数が正しく設定されているか確認

### ログの確認方法

- Supabase Dashboard → **Logs** でエラーログを確認
- ブラウザの Developer Tools でネットワークエラーを確認