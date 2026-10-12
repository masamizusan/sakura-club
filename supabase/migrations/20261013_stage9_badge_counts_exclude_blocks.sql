-- stage9: バッジの件数からブロック相手を除外する（#12）
-- 実行日: 2026-10-13
-- 背景: 一覧（メッセージ・お相手から・足跡）はブロック相手を両方向で除外しているのに、
--       バッジ（get_badge_counts）は数えていたため、一覧に出ない相手の分だけ数字が増えていた。
-- 変更:
--   unread_messages   : 相手との間にブロック（どちら向きでも）がある会話を数えない
--   unseen_likes      : ブロック相手のいいね、マッチ済みの相手のいいねを数えない（一覧と同じ基準）
--   unread_footprints : ブロック相手の足跡を数えない
--   unread_notifications : 変更なし
-- 戻り値の形・権限（SECURITY DEFINER、search_path）は変えない。

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
      (SELECT count(*) FROM public.notifications n, me
        WHERE n.user_id = me.uid AND n.is_read = false)
  );
$function$;

COMMIT;

-- 確認（定義に blocked と visible_convs が入っていれば OK）
SELECT pg_get_functiondef('public.get_badge_counts'::regproc) LIKE '%visible_convs%' AS updated;
