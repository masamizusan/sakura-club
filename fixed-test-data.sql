-- 修正版：テストデータ作成SQL

-- 手順3: テストデータ作成（修正版）

-- 1. テスト用パートナーユーザーを作成
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
) ON CONFLICT (email) DO NOTHING;

-- 2. テストパートナーのプロフィール作成
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
) ON CONFLICT (id) DO NOTHING;

-- 3. 会話を作成（メインユーザーとテストパートナー間）
WITH main_user AS (
  SELECT id FROM auth.users WHERE email = 'masamizusan0304@gmail.com'
),
test_conversation AS (
  INSERT INTO conversations (id, user1_id, user2_id, created_at, updated_at)
  SELECT 
    gen_random_uuid(), 
    m.id, 
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '1 day',
    NOW()
  FROM main_user m
  RETURNING id
)
SELECT 'Conversation created with ID: ' || id FROM test_conversation;

-- 4. テストメッセージを作成
WITH main_user AS (
  SELECT id FROM auth.users WHERE email = 'masamizusan0304@gmail.com'
),
conversation AS (
  SELECT id FROM conversations 
  WHERE user1_id = (SELECT id FROM main_user) 
     OR user2_id = (SELECT id FROM main_user)
  LIMIT 1
)
INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
SELECT 
  c.id,
  '11111111-1111-1111-1111-111111111111',
  'こんにちは！文化体験に興味があります。',
  false,
  NOW() - INTERVAL '2 hours'
FROM conversation c

UNION ALL

SELECT 
  c.id,
  m.id,
  'はじめまして！一緒に参加しましょう。',
  true,
  NOW() - INTERVAL '1 hour'
FROM conversation c, main_user m;