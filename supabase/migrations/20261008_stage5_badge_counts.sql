-- 段階5：バッジ4件数を1回で返す DB 関数（#7 案③）（本番 Supabase で実行・記録用）
-- 数え方は useNotifications の現行ロジックと同一。
-- 例外：footprints.visitor_id が NULL の行は数えない（旧ロジックは JS の Set で NULL も1人と数えていた）

BEGIN;

CREATE OR REPLACE FUNCTION public.get_badge_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid
  ),
  my_convs AS (
    -- RLS を通らないため、本人の会話に明示的に絞る
    SELECT c.id,
           CASE WHEN c.user1_id = me.uid THEN c.is_seen_user1 ELSE c.is_seen_user2 END AS my_seen
    FROM public.conversations c, me
    WHERE me.uid IS NOT NULL
      AND (c.user1_id = me.uid OR c.user2_id = me.uid)
  )
  SELECT jsonb_build_object(
    'unread_messages',
      (SELECT count(*) FROM public.messages m, me
        WHERE m.conversation_id IN (SELECT id FROM my_convs)
          AND m.sender_id <> me.uid
          AND m.is_read = false)
      + (SELECT count(*) FROM my_convs WHERE my_seen = false),
    'unseen_likes',
      (SELECT count(*) FROM public.likes l, me
        WHERE l.liked_user_id = me.uid AND l.is_seen = false),
    'unread_footprints',
      (SELECT count(DISTINCT f.visitor_id) FROM public.footprints f, me
        WHERE f.profile_owner_id = me.uid AND f.is_read = false),
    'unread_notifications',
      (SELECT count(*) FROM public.notifications n, me
        WHERE n.user_id = me.uid AND n.is_read = false)
  );
$$;

REVOKE ALL ON FUNCTION public.get_badge_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_badge_counts() TO authenticated;

-- 未読メッセージを数えるための部分索引
CREATE INDEX IF NOT EXISTS idx_messages_unread_by_conversation
  ON public.messages (conversation_id)
  WHERE is_read = false;

-- 確認
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_badge_counts';

COMMIT;
