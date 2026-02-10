-- =============================================================================
-- メッセージング機能：RLS修正・順序非依存一意化・トリガー追加
-- 2026-02-11
-- =============================================================================
-- 目的：
--   1. conversations の順序非依存一意化（重複会話防止）
--   2. messages INSERT時に conversations を自動更新するトリガー
--   3. RLSポリシーの穴を塞ぐ（参加者のみアクセス、sender_id強制）
-- =============================================================================

-- ===========================
-- PART 1: conversations 順序非依存一意化
-- ===========================

-- 1.1 user_pair_key カラム追加（generated column で自動計算）
-- LEAST/GREATEST で常に同じ順序のペアキーを生成
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS user_pair_key TEXT
GENERATED ALWAYS AS (
  LEAST(user1_id::text, user2_id::text) || '_' || GREATEST(user1_id::text, user2_id::text)
) STORED;

-- 1.2 順序非依存の一意制約を追加
-- 既存のUNIQUE(user1_id, user2_id)は残しつつ、より強い制約を追加
CREATE UNIQUE INDEX IF NOT EXISTS conversations_user_pair_key_unique
ON conversations (user_pair_key);

-- ===========================
-- PART 2: messages → conversations 自動更新トリガー
-- ===========================

-- 2.1 トリガー関数: messages INSERT/UPDATE時に conversations を更新
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 トリガー作成（INSERT/UPDATE時）
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ===========================
-- PART 3: インデックス追加（パフォーマンス）
-- ===========================

-- messages: conversation_id + created_at の複合インデックス
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages (conversation_id, created_at DESC);

-- messages: sender_id インデックス
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
ON messages (sender_id);

-- conversations: last_message_at インデックス（会話一覧ソート用）
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
ON conversations (last_message_at DESC NULLS LAST);

-- ===========================
-- PART 4: RLSポリシー修正
-- ===========================

-- -------------------------------------
-- 4.1 conversations ポリシー修正
-- -------------------------------------

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

-- SELECT: 参加者のみ閲覧可能
CREATE POLICY "conversations_select_participant"
ON conversations FOR SELECT TO authenticated
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- INSERT: 自分が参加者として含まれる会話のみ作成可能
-- user1_id または user2_id が自分である必要がある
CREATE POLICY "conversations_insert_participant"
ON conversations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- UPDATE: 参加者のみ更新可能
CREATE POLICY "conversations_update_participant"
ON conversations FOR UPDATE TO authenticated
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- DELETE: 参加者のみ削除可能（オプション）
CREATE POLICY "conversations_delete_participant"
ON conversations FOR DELETE TO authenticated
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- -------------------------------------
-- 4.2 messages ポリシー修正
-- -------------------------------------

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can view own messages" ON messages;

-- SELECT: 会話の参加者のみ閲覧可能
CREATE POLICY "messages_select_participant"
ON messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
  )
);

-- INSERT: 会話の参加者のみ送信可能、かつ sender_id は自分自身のみ
CREATE POLICY "messages_insert_participant"
ON messages FOR INSERT TO authenticated
WITH CHECK (
  -- sender_id は必ず自分
  auth.uid() = sender_id
  AND
  -- 会話の参加者である
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
  )
);

-- UPDATE: 自分が送信したメッセージのみ更新可能
CREATE POLICY "messages_update_sender"
ON messages FOR UPDATE TO authenticated
USING (
  auth.uid() = sender_id
);

-- DELETE: 自分が送信したメッセージのみ削除可能（オプション）
CREATE POLICY "messages_delete_sender"
ON messages FOR DELETE TO authenticated
USING (
  auth.uid() = sender_id
);

-- ===========================
-- PART 5: 既読更新用の追加ポリシー
-- ===========================

-- 受信者が is_read / read_at を更新できるようにする
-- （自分宛てのメッセージを既読にする）
CREATE POLICY "messages_update_read_status"
ON messages FOR UPDATE TO authenticated
USING (
  -- 会話の参加者であり、かつ送信者ではない（=受信者）
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
    AND auth.uid() != messages.sender_id
  )
);

-- ===========================
-- 完了
-- ===========================
COMMENT ON TABLE conversations IS 'ユーザー間の会話（1対1チャット）';
COMMENT ON TABLE messages IS '会話内のメッセージ';
COMMENT ON COLUMN conversations.user_pair_key IS '順序非依存のユーザーペアキー（重複会話防止）';
