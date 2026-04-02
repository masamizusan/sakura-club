-- conversations テーブルに既読フラグを追加
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_seen_user1 BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_seen_user2 BOOLEAN NOT NULL DEFAULT FALSE;

-- 既存の会話は既読扱い（過去データにバッジが出ないように）
UPDATE conversations SET is_seen_user1 = TRUE, is_seen_user2 = TRUE;

-- インデックス（未読会話の絞り込み高速化）
CREATE INDEX IF NOT EXISTS idx_conversations_seen_user1 ON conversations (user1_id, is_seen_user1);
CREATE INDEX IF NOT EXISTS idx_conversations_seen_user2 ON conversations (user2_id, is_seen_user2);
