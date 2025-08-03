-- 簡単なテストデータ作成（auth.usersを避ける方法）

-- 1. テスト用プロフィールを直接作成
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
  updated_at = NOW();

-- 2. 会話を作成（あなたのIDを使用）
INSERT INTO conversations (id, user1_id, user2_id, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  '11111111-1111-1111-1111-111111111111',
  NOW() - INTERVAL '1 day',
  NOW()
) ON CONFLICT (user1_id, user2_id) DO UPDATE SET
  updated_at = NOW();

-- 3. テストメッセージを作成
INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
VALUES 
(
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'こんにちは！文化体験に興味があります。',
  false,
  NOW() - INTERVAL '2 hours'
),
(
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  'はじめまして！一緒に参加しましょう。',
  true,
  NOW() - INTERVAL '1 hour'
);

-- 4. 確認クエリ
SELECT 'テストデータ作成完了' as status;
SELECT COUNT(*) as conversation_count FROM conversations;
SELECT COUNT(*) as message_count FROM messages;