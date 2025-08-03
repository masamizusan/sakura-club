# Supabase SQL実行ガイド

## 方法1: Supabaseダッシュボード（推奨）

### 手順：
1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトにログイン

2. **SQL Editorを開く**
   - 左サイドバーから「SQL Editor」をクリック
   - または「Database」→「SQL Editor」

3. **SQLを実行**
   - 新しいクエリを作成（「New query」ボタン）
   - 以下のSQLをコピー&ペースト：

```sql
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmation_token = NULL,
  confirmed_at = NOW()
WHERE email = 'masamizusan0304@gmail.com';
```

4. **実行**
   - 「Run」ボタンをクリック
   - 結果を確認

5. **確認クエリも実行**
```sql
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmed_at,
  confirmation_token
FROM auth.users 
WHERE email = 'masamizusan0304@gmail.com';
```

## 方法2: ローカルCLI（上級者向け）

```bash
# Supabase CLIがインストールされている場合
supabase db reset --db-url "your-database-url"
```

## 注意事項
- auth.usersテーブルは認証関連の重要なテーブルです
- 本番環境では慎重に実行してください
- バックアップを取ることをお勧めします

## トラブルシューティング
- 権限エラーが出る場合：プロジェクトの管理者権限を確認
- テーブルが見つからない場合：Database > Tables から auth.users テーブルの存在を確認