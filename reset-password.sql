-- テストユーザーのパスワードをリセット (パスワード: TestPass123!)
UPDATE auth.users 
SET encrypted_password = crypt('TestPass123!', gen_salt('bf'))
WHERE email = 'masamizusan0304@gmail.com';

-- 確認用クエリ
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'masamizusan0304@gmail.com';