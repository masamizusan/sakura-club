-- 簡単なテストデータ作成

-- 1. 現在のユーザーIDを確認
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'masamizusan0304@gmail.com';

-- 2. テスト用パートナーユーザーを作成
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'test.partner@example.com',
  crypt('TestPass123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO UPDATE SET
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- 3. テストパートナーのプロフィール作成
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  gender,
  age,
  nationality,
  prefecture,
  city,
  interests,
  bio,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test.partner@example.com',
  '花子',
  '佐藤',
  'female',
  25,
  'JP',
  '大阪府',
  '大阪市',
  ARRAY['読書', '映画鑑賞'],
  'よろしくお願いします！',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  first_name = '花子',
  last_name = '佐藤',
  updated_at = NOW();

-- 4. 会話を作成（メインユーザーIDを手動で置き換える必要があります）
-- この部分は実際のユーザーIDに置き換えてください
/*
INSERT INTO conversations (
  id,
  user1_id,
  user2_id,
  created_at,
  updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'YOUR_ACTUAL_USER_ID_HERE',  -- これを実際のIDに置き換え
  '11111111-1111-1111-1111-111111111111',
  NOW() - INTERVAL '1 day',
  NOW()
);
*/

-- 5. 確認クエリ
SELECT 'テストユーザー作成完了' as status;