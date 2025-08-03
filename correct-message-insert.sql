-- 正しいカラム名でメッセージを作成

INSERT INTO messages (
  sender_id,
  receiver_id,
  topic,
  extension,
  content,
  read_at,
  private,
  created_at
) VALUES (
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  'test-conversation',
  'txt',
  'テストメッセージ：API動作確認中です！',
  NULL,  -- 未読なのでNULL
  false,
  NOW()
);

-- 確認
SELECT COUNT(*) as message_count FROM messages;
SELECT * FROM messages ORDER BY created_at DESC LIMIT 1;