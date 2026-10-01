-- 段階2-B：いいね処理の DB 関数化と likes / matches の直接書き込み禁止（本番 Supabase で 2026-09-30 実行済み・記録用）

-- ============================================================
-- ステップ1：重複整理・制約・DB 関数
-- ============================================================
BEGIN;

-- 1. 重複いいねの整理（各組み合わせで、いちばん古い1件だけ残す）
DELETE FROM public.likes l
USING (
  SELECT id,
         row_number() OVER (PARTITION BY liker_id, liked_user_id ORDER BY created_at, id) AS rn
  FROM public.likes
) d
WHERE l.id = d.id AND d.rn > 1;

-- 2. 制約
ALTER TABLE public.likes
  ADD CONSTRAINT likes_liker_liked_unique UNIQUE (liker_id, liked_user_id);

ALTER TABLE public.matches
  ADD CONSTRAINT matches_pair_unique UNIQUE (user1_id, user2_id);

ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check CHECK (status IN ('pending', 'matched', 'rejected'));

-- 3. 1日のいいね上限（ここ1か所で管理）
CREATE OR REPLACE FUNCTION public.like_daily_limit()
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 10 $$;

-- 4. 今日の残り回数
CREATE OR REPLACE FUNCTION public.get_like_quota()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'limit', public.like_daily_limit(),
    'used', count(*),
    'remaining', GREATEST(public.like_daily_limit() - count(*), 0)
  )
  FROM public.likes
  WHERE liker_id = auth.uid()
    AND created_at >= ((now() AT TIME ZONE 'Asia/Tokyo')::date)::timestamp AT TIME ZONE 'Asia/Tokyo';
$$;

-- 5. いいね送信（確認 → 回数 → 記録 → マッチ判定 → 会話作成 を一度に）
CREATE OR REPLACE FUNCTION public.send_like(p_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_limit     int  := public.like_daily_limit();
  v_day_start timestamptz := ((now() AT TIME ZONE 'Asia/Tokyo')::date)::timestamp AT TIME ZONE 'Asia/Tokyo';
  v_used      int;
  v_u1        uuid;
  v_u2        uuid;
  v_status    text;
  v_matched   boolean := false;
  v_conv_id   uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'auth_required');
  END IF;

  IF p_target IS NULL OR p_target = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_target');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND status = 'active' AND profile_initialized IS TRUE
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'profile_incomplete');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_target AND status = 'active' AND profile_initialized IS TRUE
  ) OR public.is_blocked_with(p_target) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'target_unavailable');
  END IF;

  v_u1 := LEAST(v_uid, p_target);
  v_u2 := GREATEST(v_uid, p_target);
  PERFORM pg_advisory_xact_lock(hashtext('like_user:' || v_uid::text));
  PERFORM pg_advisory_xact_lock(hashtext('like_pair:' || v_u1::text || v_u2::text));

  SELECT count(*) INTO v_used
  FROM public.likes
  WHERE liker_id = v_uid AND created_at >= v_day_start;

  SELECT status INTO v_status
  FROM public.matches
  WHERE user1_id = v_u1 AND user2_id = v_u2;

  IF v_status = 'matched' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_matched',
      'remaining', GREATEST(v_limit - v_used, 0), 'limit', v_limit);
  END IF;

  IF EXISTS (SELECT 1 FROM public.likes WHERE liker_id = v_uid AND liked_user_id = p_target) THEN
    RETURN jsonb_build_object('ok', true, 'code', 'already_liked', 'matched', false,
      'remaining', GREATEST(v_limit - v_used, 0), 'limit', v_limit, 'conversation_id', NULL);
  END IF;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'code', 'daily_limit',
      'remaining', 0, 'limit', v_limit);
  END IF;

  v_matched := EXISTS (
    SELECT 1 FROM public.likes WHERE liker_id = p_target AND liked_user_id = v_uid
  );

  INSERT INTO public.likes (liker_id, liked_user_id, is_seen)
  VALUES (v_uid, p_target, v_matched);

  INSERT INTO public.matches (user1_id, user2_id, status)
  VALUES (v_u1, v_u2, CASE WHEN v_matched THEN 'matched' ELSE 'pending' END)
  ON CONFLICT (user1_id, user2_id)
  DO UPDATE SET status = EXCLUDED.status, updated_at = now();

  IF v_matched THEN
    UPDATE public.likes SET is_seen = true
    WHERE liker_id = p_target AND liked_user_id = v_uid;

    SELECT id INTO v_conv_id
    FROM public.conversations
    WHERE (user1_id = v_u1 AND user2_id = v_u2)
       OR (user1_id = v_u2 AND user2_id = v_u1)
    LIMIT 1;

    IF v_conv_id IS NULL THEN
      INSERT INTO public.conversations (user1_id, user2_id, is_seen_user1, is_seen_user2)
      VALUES (v_u1, v_u2, false, false)
      RETURNING id INTO v_conv_id;
    ELSE
      UPDATE public.conversations
      SET is_seen_user1 = false, is_seen_user2 = false, updated_at = now()
      WHERE id = v_conv_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', CASE WHEN v_matched THEN 'matched' ELSE 'liked' END,
    'matched', v_matched,
    'remaining', GREATEST(v_limit - v_used - 1, 0),
    'limit', v_limit,
    'conversation_id', v_conv_id
  );
END;
$$;

-- 6. 実行権限：ログインユーザーのみ
REVOKE ALL ON FUNCTION public.get_like_quota() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_like_quota() TO authenticated;

REVOKE ALL ON FUNCTION public.send_like(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.send_like(uuid) TO authenticated;

COMMIT;

-- ============================================================
-- ステップ3：likes / matches へのユーザー権限での直接書き込みを禁止
-- ============================================================
BEGIN;

DROP POLICY likes_insert_own ON public.likes;
REVOKE INSERT, UPDATE, DELETE ON public.likes FROM anon, authenticated;
REVOKE ALL ON public.likes FROM anon;

DROP POLICY matches_insert_participant ON public.matches;
DROP POLICY matches_update_participant ON public.matches;
REVOKE INSERT, UPDATE, DELETE ON public.matches FROM anon, authenticated;
REVOKE ALL ON public.matches FROM anon;

COMMIT;
