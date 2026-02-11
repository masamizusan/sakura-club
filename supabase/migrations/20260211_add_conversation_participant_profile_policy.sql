-- profiles SELECT ポリシー追加: 会話参加者のプロフィール閲覧許可
-- 2026-02-11
-- 目的: マッチした相手のプロフィールは profile_initialized に関係なく見られるようにする

-- 既存ポリシーを削除してから再作成
DROP POLICY IF EXISTS "profiles_select_conversation_partner" ON profiles;

-- 新規ポリシー: 会話の相手のプロフィールを見られるようにする
CREATE POLICY "profiles_select_conversation_partner"
ON profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE (c.user1_id = auth.uid() AND c.user2_id = profiles.id)
       OR (c.user2_id = auth.uid() AND c.user1_id = profiles.id)
  )
);
