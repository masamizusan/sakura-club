-- 最小限のテストデータ作成

-- 1. 新しいIDで会話を作成
INSERT INTO conversations (user1_id, user2_id, created_at, updated_at)
VALUES (
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  '00a3f36e-39b8-474f-b890-70f8666fa17c',
  NOW(),
  NOW()
);

-- 2. 作成された会話IDを確認
SELECT id, user1_id, user2_id FROM conversations 
WHERE user1_id = '00a3f36e-39b8-474f-b890-70f8666fa17c' 
ORDER BY created_at DESC 
LIMIT 1;