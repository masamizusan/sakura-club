-- 既存ユーザーのみでテストデータ作成

-- 1. 自分自身との会話を作成（テスト用）
INSERT INTO conversations (id, user1_id, user2_id, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  NOW() - INTERVAL '1 day',
  NOW()
) ON CONFLICT (user1_id, user2_id) DO UPDATE SET
  updated_at = NOW();

-- 2. テストメッセージを作成（自分からのメッセージとして）
INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
VALUES 
(
  '22222222-2222-2222-2222-222222222222',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  'テストメッセージ1：こんにちは！',
  false,
  NOW() - INTERVAL '2 hours'
),
(
  '22222222-2222-2222-2222-222222222222',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  'テストメッセージ2：API動作確認中です。',
  true,
  NOW() - INTERVAL '1 hour'
);

-- 3. 確認クエリ
SELECT 'テストデータ作成完了' as status;
SELECT COUNT(*) as conversation_count FROM conversations;
SELECT COUNT(*) as message_count FROM messages;

-- 4. 作成された会話を確認
SELECT 
  c.id as conversation_id,
  c.user1_id,
  c.user2_id,
  p.name as user_name
FROM conversations c
JOIN profiles p ON p.id = c.user1_id
WHERE c.id = '22222222-2222-2222-2222-222222222222';