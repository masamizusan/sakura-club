-- 段階4：message_translations の RLS 強化と experience_participants の閲覧制限（本番 Supabase で実行・記録用）
-- 前提：translate/message の書き込みは b77a3891 で service_role に移行済み

BEGIN;

-- 1. message_translations：誰でも読める・書けるポリシーを削除
DROP POLICY IF EXISTS "Users can insert translations" ON public.message_translations;
DROP POLICY IF EXISTS "Users can read translations" ON public.message_translations;

-- 2. 読み取りは「そのメッセージの会話の参加者」だけ
CREATE POLICY message_translations_select_participant ON public.message_translations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_translations.message_id
      AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
  )
);

-- 3. ユーザー権限での書き込みを禁止（書き込みは service_role のみ）
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.message_translations FROM authenticated;
REVOKE ALL ON public.message_translations FROM anon;

-- 4. experience_participants：参加者一覧はログインユーザーのみ閲覧可
DROP POLICY IF EXISTS "Users can view experience participants" ON public.experience_participants;
CREATE POLICY experience_participants_select_authenticated ON public.experience_participants
FOR SELECT TO authenticated
USING (true);

-- 5. 確認
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('message_translations', 'experience_participants')
ORDER BY tablename, policyname;

COMMIT;
