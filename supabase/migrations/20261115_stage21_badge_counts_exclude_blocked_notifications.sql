-- stage21: 通知の件数（バッジ）からブロック相手の通知を除く（S1）
-- 作成日: 2026-11-15（実行はプロダクトオーナーが push の後に Supabase の SQL Editor で行う）
-- 背景: 足跡・お相手から・メッセージのバッジは stage9 でブロック相手を除いたが、
--       通知（unread_notifications）はブロック相手からの match・さくらいいねの通知も数えていた。
--       通知の一覧（/api/notifications）も同じ基準で絞る（同じコミットで API を変更）。
-- 変更: get_badge_counts の unread_notifications だけ。ほかの 3 つ・戻り値の形・SECURITY DEFINER・search_path は stage9 と同じ。
--       data->>'matched_user_id' / data->>'from_user_id' は文字として比べる（形の違う値があっても型の変換で落ちない）
-- 順番: 0（今の定義の確認）→ 1（作り直し・権限の付け直し）→ 2（確かめる SELECT）
-- API が先に出ても壊れない（DB を作り直すまで、バッジの件数だけブロック相手の分が多いまま）

-- ============================================================
-- 0. 今の本番の定義を確かめる（stage9 の定義＝ unread_notifications に blocked が無いこと）
-- ============================================================
SELECT pg_get_functiondef('public.get_badge_counts'::regproc) AS current_definition;
-- 期待: 'visible_convs' を含み、'unread_notifications' の後に NOT EXISTS が無い
SELECT pg_get_functiondef('public.get_badge_counts'::regproc) LIKE '%visible_convs%' AS is_stage9,
       pg_get_functiondef('public.get_badge_counts'::regproc) LIKE '%matched_user_id%' AS already_stage21;

-- ============================================================
-- 1. 作り直し（自己完結のトランザクション。末尾の COMMIT まで一緒に実行する）
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.get_badge_counts()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH me AS (
    SELECT auth.uid() AS uid
  ),
  blocked AS (
    -- 自分がブロックした相手・自分をブロックした相手（両方向）
    SELECT CASE WHEN b.blocker_id = me.uid THEN b.blocked_id ELSE b.blocker_id END AS other_id
    FROM public.blocks b, me
    WHERE me.uid IS NOT NULL
      AND (b.blocker_id = me.uid OR b.blocked_id = me.uid)
  ),
  my_convs AS (
    -- RLS を通らないため、本人の会話に明示的に絞る
    SELECT c.id,
           CASE WHEN c.user1_id = me.uid THEN c.is_seen_user1 ELSE c.is_seen_user2 END AS my_seen,
           CASE WHEN c.user1_id = me.uid THEN c.user2_id ELSE c.user1_id END AS other_id
    FROM public.conversations c, me
    WHERE me.uid IS NOT NULL
      AND (c.user1_id = me.uid OR c.user2_id = me.uid)
  ),
  visible_convs AS (
    SELECT mc.* FROM my_convs mc
    WHERE NOT EXISTS (SELECT 1 FROM blocked bl WHERE bl.other_id = mc.other_id)
  )
  SELECT jsonb_build_object(
    'unread_messages',
      (SELECT count(*) FROM public.messages m, me
        WHERE m.conversation_id IN (SELECT id FROM visible_convs)
          AND m.sender_id <> me.uid
          AND m.is_read = false)
      + (SELECT count(*) FROM visible_convs WHERE my_seen = false),
    'unseen_likes',
      (SELECT count(*) FROM public.likes l, me
        WHERE l.liked_user_id = me.uid AND l.is_seen = false
          AND NOT EXISTS (SELECT 1 FROM blocked bl WHERE bl.other_id = l.liker_id)
          AND NOT EXISTS (
            SELECT 1 FROM public.matches mt
            WHERE mt.status = 'matched'
              AND ((mt.user1_id = me.uid AND mt.user2_id = l.liker_id)
                OR (mt.user1_id = l.liker_id AND mt.user2_id = me.uid)))),
    'unread_footprints',
      (SELECT count(DISTINCT f.visitor_id) FROM public.footprints f, me
        WHERE f.profile_owner_id = me.uid AND f.is_read = false
          AND NOT EXISTS (SELECT 1 FROM blocked bl WHERE bl.other_id = f.visitor_id)),
    'unread_notifications',
      -- stage21: 相手のある通知（match の data.matched_user_id、さくらいいねの data.from_user_id）は、
      --          ブロック相手（両方向）のものを数えない。相手の id が無い通知（運営からの通知など）は今までどおり数える
      (SELECT count(*) FROM public.notifications n, me
        WHERE n.user_id = me.uid AND n.is_read = false
          AND NOT EXISTS (
            SELECT 1 FROM blocked bl
            WHERE bl.other_id::text = n.data->>'matched_user_id'
               OR bl.other_id::text = n.data->>'from_user_id'))
  );
$function$;

-- 権限の付け直し（stage5・stage11 と同じ：PUBLIC・anon は不可、authenticated だけ実行できる）
REVOKE ALL ON FUNCTION public.get_badge_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_badge_counts() TO authenticated;

COMMIT;

-- ============================================================
-- 2. 確かめる
-- ============================================================
-- 定義に stage21 の条件が入ったか（true なら OK）
SELECT pg_get_functiondef('public.get_badge_counts'::regproc) LIKE '%matched_user_id%' AS updated;
-- 権限（anon=false、authenticated=true なら OK）
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_badge_counts';

-- ============================================================
-- 外すとき（stage9 の定義に戻す）：下のコメントを外して、BEGIN から COMMIT まで一緒に実行する
-- ============================================================
-- BEGIN;
--
-- CREATE OR REPLACE FUNCTION public.get_badge_counts()
--  RETURNS jsonb
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
--   WITH me AS (
--     SELECT auth.uid() AS uid
--   ),
--   blocked AS (
--     -- 自分がブロックした相手・自分をブロックした相手（両方向）
--     SELECT CASE WHEN b.blocker_id = me.uid THEN b.blocked_id ELSE b.blocker_id END AS other_id
--     FROM public.blocks b, me
--     WHERE me.uid IS NOT NULL
--       AND (b.blocker_id = me.uid OR b.blocked_id = me.uid)
--   ),
--   my_convs AS (
--     -- RLS を通らないため、本人の会話に明示的に絞る
--     SELECT c.id,
--            CASE WHEN c.user1_id = me.uid THEN c.is_seen_user1 ELSE c.is_seen_user2 END AS my_seen,
--            CASE WHEN c.user1_id = me.uid THEN c.user2_id ELSE c.user1_id END AS other_id
--     FROM public.conversations c, me
--     WHERE me.uid IS NOT NULL
--       AND (c.user1_id = me.uid OR c.user2_id = me.uid)
--   ),
--   visible_convs AS (
--     SELECT mc.* FROM my_convs mc
--     WHERE NOT EXISTS (SELECT 1 FROM blocked bl WHERE bl.other_id = mc.other_id)
--   )
--   SELECT jsonb_build_object(
--     'unread_messages',
--       (SELECT count(*) FROM public.messages m, me
--         WHERE m.conversation_id IN (SELECT id FROM visible_convs)
--           AND m.sender_id <> me.uid
--           AND m.is_read = false)
--       + (SELECT count(*) FROM visible_convs WHERE my_seen = false),
--     'unseen_likes',
--       (SELECT count(*) FROM public.likes l, me
--         WHERE l.liked_user_id = me.uid AND l.is_seen = false
--           AND NOT EXISTS (SELECT 1 FROM blocked bl WHERE bl.other_id = l.liker_id)
--           AND NOT EXISTS (
--             SELECT 1 FROM public.matches mt
--             WHERE mt.status = 'matched'
--               AND ((mt.user1_id = me.uid AND mt.user2_id = l.liker_id)
--                 OR (mt.user1_id = l.liker_id AND mt.user2_id = me.uid)))),
--     'unread_footprints',
--       (SELECT count(DISTINCT f.visitor_id) FROM public.footprints f, me
--         WHERE f.profile_owner_id = me.uid AND f.is_read = false
--           AND NOT EXISTS (SELECT 1 FROM blocked bl WHERE bl.other_id = f.visitor_id)),
--     'unread_notifications',
--       (SELECT count(*) FROM public.notifications n, me
--         WHERE n.user_id = me.uid AND n.is_read = false)
--   );
-- $function$;
--
-- REVOKE ALL ON FUNCTION public.get_badge_counts() FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.get_badge_counts() TO authenticated;
--
-- COMMIT;
