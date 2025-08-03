-- 既存ユーザーデータを完全削除するSQL

-- 1. プロフィールデータを削除
DELETE FROM profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'masamizusan0304@gmail.com'
);

-- 2. 認証ユーザーを削除
DELETE FROM auth.users WHERE email = 'masamizusan0304@gmail.com';

-- 3. 削除確認用クエリ
-- ユーザーが削除されたか確認
SELECT COUNT(*) as user_count
FROM auth.users
WHERE email = 'masamizusan0304@gmail.com';

-- プロフィールが削除されたか確認
SELECT COUNT(*) as profile_count
FROM profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'masamizusan0304@gmail.com'
);