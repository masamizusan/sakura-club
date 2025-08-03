-- テストデータの作成（実際のユーザーIDに置き換えてください）

-- 1. まず現在のユーザーIDを確認（上記SQLの結果を使用）
-- 例：ユーザーID = 'abc123-def456-ghi789'

-- 2. テスト用の別ユーザーを作成（または既存ユーザーを使用）
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test.partner@example.com',
  crypt('TestPass123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 3. テストパートナーのプロフィール作成
WITH test_user AS (
  SELECT id FROM auth.users WHERE email = 'test.partner@example.com'
)
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
) 
SELECT 
  id,
  'test.partner@example.com',
  '花子',
  '佐藤',
  'female',
  25,
  'JP',
  '大阪府',
  '大阪市',
  ARRAY['読書', '映画鑑賞', '料理'],
  'はじめまして。文化交流に興味があります。',
  NOW(),
  NOW()
FROM test_user
ON CONFLICT (id) DO NOTHING;

-- 4. 会話とメッセージのテストデータ作成
-- 注意：YOUR_USER_IDを実際のユーザーIDに置き換えてください

-- 例（実際のIDに置き換える必要があります）:
/*
WITH main_user AS (
  SELECT id FROM auth.users WHERE email = 'masamizusan0304@gmail.com'
),
partner_user AS (
  SELECT id FROM auth.users WHERE email = 'test.partner@example.com'
),
new_conversation AS (
  INSERT INTO conversations (user1_id, user2_id, created_at, updated_at)
  SELECT m.id, p.id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'
  FROM main_user m, partner_user p
  RETURNING id
)
INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
SELECT 
  nc.id,
  pu.id,
  'こんにちは！文化体験に一緒に参加しませんか？',
  false,
  NOW() - INTERVAL '1 hour'
FROM new_conversation nc, partner_user pu;
*/

-- 上記のコメント部分を実際のユーザーIDで実行してください