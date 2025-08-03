-- 既存データを確認

-- 1. 既存の会話を確認
SELECT * FROM conversations;

-- 2. 既存のメッセージを確認
SELECT * FROM messages;

-- 3. 既存データがある場合はスキップ、ない場合は新しいIDで作成
INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
VALUES 
(
  '22222222-2222-2222-2222-222222222222',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  'テストメッセージ：API動作確認',
  false,
  NOW()
) ON CONFLICT DO NOTHING;

-- 4. 確認
SELECT 'データ確認完了' as status;
SELECT COUNT(*) as conversation_count FROM conversations;
SELECT COUNT(*) as message_count FROM messages;