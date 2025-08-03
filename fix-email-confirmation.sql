-- メール確認エラーを解決するためのSQL（修正版）
-- confirmed_atは生成カラムなので除外

UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmation_token = NULL
WHERE email = 'masamizusan0304@gmail.com';

-- 確認用クエリ
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmed_at,
  confirmation_token
FROM auth.users 
WHERE email = 'masamizusan0304@gmail.com';