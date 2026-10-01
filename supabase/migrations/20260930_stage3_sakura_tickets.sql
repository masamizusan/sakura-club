-- 段階3-1：さくらいいね 回数券テーブル・付与/無効化・残高・send_like 拡張（本番 Supabase で 2026-09-30 実行済み・記録用）
BEGIN;

-- ============================================================
-- 1. 回数券の購入記録
-- ============================================================
CREATE TABLE public.sakura_ticket_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  remaining int NOT NULL CHECK (remaining >= 0),
  expires_at timestamptz NOT NULL,
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  amount_total int,
  currency text,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (remaining <= quantity)
);

CREATE INDEX sakura_ticket_purchases_user_idx
  ON public.sakura_ticket_purchases (user_id, expires_at);
CREATE INDEX sakura_ticket_purchases_pi_idx
  ON public.sakura_ticket_purchases (stripe_payment_intent_id);

ALTER TABLE public.sakura_ticket_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY sakura_purchases_select_own ON public.sakura_ticket_purchases
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON public.sakura_ticket_purchases FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.sakura_ticket_purchases FROM authenticated;

-- ============================================================
-- 2. likes：さくらいいねの項目
-- ============================================================
ALTER TABLE public.likes
  ADD COLUMN is_special boolean NOT NULL DEFAULT false,
  ADD COLUMN special_message text,
  ADD COLUMN special_message_ja text,
  ADD COLUMN special_sent_at timestamptz,
  ADD COLUMN sakura_purchase_id uuid REFERENCES public.sakura_ticket_purchases(id) ON DELETE SET NULL,
  ADD CONSTRAINT likes_special_message_len
    CHECK (special_message IS NULL OR char_length(special_message) <= 100);

-- ============================================================
-- 3. 回数券の付与（Webhook から service_role で呼ぶ。同じ決済は1回だけ）
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_sakura_tickets(
  p_user uuid,
  p_quantity int,
  p_session_id text,
  p_payment_intent text,
  p_amount_total int,
  p_currency text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_quantity NOT IN (1, 5, 30) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_quantity');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'user_not_found');
  END IF;

  INSERT INTO public.sakura_ticket_purchases
    (user_id, quantity, remaining, expires_at,
     stripe_checkout_session_id, stripe_payment_intent_id, amount_total, currency)
  VALUES
    (p_user, p_quantity, p_quantity, now() + interval '180 days',
     p_session_id, p_payment_intent, p_amount_total, p_currency)
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'code', 'already_granted');
  END IF;

  RETURN jsonb_build_object('ok', true, 'code', 'granted', 'purchase_id', v_id);
END;
$$;

-- 返金時：その決済の残りを無効にする
CREATE OR REPLACE FUNCTION public.revoke_sakura_tickets(p_payment_intent text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.sakura_ticket_purchases
  SET remaining = 0,
      refunded_at = COALESCE(refunded_at, now())
  WHERE stripe_payment_intent_id = p_payment_intent;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'updated', v_count);
END;
$$;

-- ============================================================
-- 4. 自分の残り枚数と、次に失効する日時
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sakura_balance()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'balance', COALESCE(sum(remaining), 0),
    'next_expiry', min(expires_at)
  )
  FROM public.sakura_ticket_purchases
  WHERE user_id = auth.uid()
    AND remaining > 0
    AND refunded_at IS NULL
    AND expires_at > now();
$$;

-- ============================================================
-- 5. 1日の残り回数（さくらいいねとして新規に送った分は数えない）
-- ============================================================
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
    AND created_at >= ((now() AT TIME ZONE 'Asia/Tokyo')::date)::timestamp AT TIME ZONE 'Asia/Tokyo'
    AND (is_special = false OR special_sent_at IS NULL OR special_sent_at > created_at);
$$;

-- ============================================================
-- 6. いいね処理の本体（通常・さくらいいね共通。service_role からのみ呼べる）
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_like_internal(
  p_sender uuid,
  p_target uuid,
  p_is_special boolean DEFAULT false,
  p_message text DEFAULT NULL,
  p_message_ja text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit            int := public.like_daily_limit();
  v_day_start        timestamptz := ((now() AT TIME ZONE 'Asia/Tokyo')::date)::timestamp AT TIME ZONE 'Asia/Tokyo';
  v_used             int;
  v_u1               uuid;
  v_u2               uuid;
  v_status           text;
  v_matched          boolean := false;
  v_conv_id          uuid;
  v_existing_id      uuid;
  v_existing_special boolean;
  v_ticket_id        uuid;
  v_message          text;
BEGIN
  IF p_sender IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'auth_required');
  END IF;

  IF p_target IS NULL OR p_target = p_sender THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_target');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_sender AND status = 'active' AND profile_initialized IS TRUE
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'profile_incomplete');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_target AND status = 'active' AND profile_initialized IS TRUE
  ) OR EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_sender AND blocked_id = p_target)
       OR (blocker_id = p_target AND blocked_id = p_sender)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'target_unavailable');
  END IF;

  v_message := NULLIF(btrim(p_message), '');
  IF v_message IS NOT NULL THEN
    IF NOT p_is_special THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_message');
    END IF;
    IF char_length(v_message) > 100 THEN
      RETURN jsonb_build_object('ok', false, 'code', 'message_too_long');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = p_sender AND verification_status = 'approved'
    ) OR NOT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = p_sender AND status = 'active'
    ) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'message_not_allowed');
    END IF;
  END IF;

  v_u1 := LEAST(p_sender, p_target);
  v_u2 := GREATEST(p_sender, p_target);
  PERFORM pg_advisory_xact_lock(hashtext('like_user:' || p_sender::text));
  PERFORM pg_advisory_xact_lock(hashtext('like_pair:' || v_u1::text || v_u2::text));

  SELECT count(*) INTO v_used
  FROM public.likes
  WHERE liker_id = p_sender
    AND created_at >= v_day_start
    AND (is_special = false OR special_sent_at IS NULL OR special_sent_at > created_at);

  SELECT status INTO v_status
  FROM public.matches
  WHERE user1_id = v_u1 AND user2_id = v_u2;

  IF v_status = 'matched' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_matched',
      'remaining', GREATEST(v_limit - v_used, 0), 'limit', v_limit);
  END IF;

  SELECT id, is_special INTO v_existing_id, v_existing_special
  FROM public.likes
  WHERE liker_id = p_sender AND liked_user_id = p_target;

  IF NOT p_is_special THEN
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'code', 'already_liked', 'matched', false,
        'is_special', COALESCE(v_existing_special, false),
        'remaining', GREATEST(v_limit - v_used, 0), 'limit', v_limit, 'conversation_id', NULL);
    END IF;
    IF v_used >= v_limit THEN
      RETURN jsonb_build_object('ok', false, 'code', 'daily_limit',
        'remaining', 0, 'limit', v_limit);
    END IF;
  ELSE
    IF v_existing_special IS TRUE THEN
      RETURN jsonb_build_object('ok', false, 'code', 'already_special');
    END IF;

    SELECT id INTO v_ticket_id
    FROM public.sakura_ticket_purchases
    WHERE user_id = p_sender
      AND remaining > 0
      AND refunded_at IS NULL
      AND expires_at > now()
    ORDER BY expires_at, created_at
    LIMIT 1
    FOR UPDATE;

    IF v_ticket_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'no_tickets');
    END IF;

    UPDATE public.sakura_ticket_purchases
    SET remaining = remaining - 1
    WHERE id = v_ticket_id;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.likes
      SET is_special = true,
          special_message = v_message,
          special_message_ja = CASE WHEN v_message IS NOT NULL THEN p_message_ja END,
          special_sent_at = now(),
          sakura_purchase_id = v_ticket_id,
          is_seen = false
      WHERE id = v_existing_id;

      RETURN jsonb_build_object('ok', true, 'code', 'upgraded', 'matched', false,
        'is_special', true,
        'remaining', GREATEST(v_limit - v_used, 0), 'limit', v_limit, 'conversation_id', NULL);
    END IF;
  END IF;

  v_matched := EXISTS (
    SELECT 1 FROM public.likes WHERE liker_id = p_target AND liked_user_id = p_sender
  );

  INSERT INTO public.likes
    (liker_id, liked_user_id, is_seen, is_special,
     special_message, special_message_ja, special_sent_at, sakura_purchase_id)
  VALUES
    (p_sender, p_target, v_matched, p_is_special,
     CASE WHEN p_is_special THEN v_message END,
     CASE WHEN p_is_special AND v_message IS NOT NULL THEN p_message_ja END,
     CASE WHEN p_is_special THEN now() END,
     v_ticket_id);

  INSERT INTO public.matches (user1_id, user2_id, status)
  VALUES (v_u1, v_u2, CASE WHEN v_matched THEN 'matched' ELSE 'pending' END)
  ON CONFLICT (user1_id, user2_id)
  DO UPDATE SET status = EXCLUDED.status, updated_at = now();

  IF v_matched THEN
    UPDATE public.likes SET is_seen = true
    WHERE liker_id = p_target AND liked_user_id = p_sender;

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
    'is_special', p_is_special,
    'remaining', CASE WHEN p_is_special
                      THEN GREATEST(v_limit - v_used, 0)
                      ELSE GREATEST(v_limit - v_used - 1, 0) END,
    'limit', v_limit,
    'conversation_id', v_conv_id
  );
END;
$$;

-- ============================================================
-- 7. 通常いいね（ブラウザ・API から）：本体を「自分として・通常いいね」で呼ぶだけ
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_like(p_target uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.send_like_internal(auth.uid(), p_target, false, NULL, NULL);
$$;

-- ============================================================
-- 8. 実行権限
-- ============================================================
REVOKE ALL ON FUNCTION public.send_like_internal(uuid, uuid, boolean, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_like_internal(uuid, uuid, boolean, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.grant_sakura_tickets(uuid, int, text, text, int, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_sakura_tickets(uuid, int, text, text, int, text) TO service_role;

REVOKE ALL ON FUNCTION public.revoke_sakura_tickets(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_sakura_tickets(text) TO service_role;

REVOKE ALL ON FUNCTION public.get_sakura_balance() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_sakura_balance() TO authenticated;

COMMIT;
