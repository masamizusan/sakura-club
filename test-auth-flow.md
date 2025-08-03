# 認証フロー テスト手順

## 1. メール確認の修正
Supabaseダッシュボードで以下のSQLを実行：
```sql
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmation_token = NULL,
  confirmed_at = NOW()
WHERE email = 'masamizusan0304@gmail.com';
```

## 2. ログインテスト
1. http://localhost:3000/login にアクセス
2. **メールアドレス**: `masamizusan0304@gmail.com`
3. **パスワード**: `TestPass123!`
4. ログイン実行

## 3. 認証状態の確認
ログイン後、以下のエンドポイントで認証状態を確認：
- GET `/api/auth/me` - ユーザー情報と認証状態
- GET `/api/messages` - 会話一覧（認証が必要）

## 4. 代替案：新しいテストアカウント
既存アカウントで問題が続く場合：
- **メールアドレス**: `test@example.com`
- **パスワード**: `TestPass123!`
- 新規登録で作成

## 5. 確認項目
- [ ] ログイン成功
- [ ] `/api/auth/me` レスポンス正常
- [ ] `/api/messages` 認証エラーなし
- [ ] クッキーベース認証動作確認