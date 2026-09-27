-- 段階1-A：DB 書き込み経路の保護（本番 Supabase で 2026-09-27 実行済み・記録用）
BEGIN;

-- ============================================================
-- 1. profiles：重要カラムの保護トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION public.profiles_protect_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- 管理者API(service_role)と SQL Editor(ログイン情報なし)は制限しない
  IF coalesce(auth.role(), '') IN ('service_role', '') THEN
    RETURN NEW;
  END IF;

  -- 管理用カラム：本人による変更はエラー
  IF NEW.verification_status       IS DISTINCT FROM OLD.verification_status
  OR NEW.verification_submitted_at IS DISTINCT FROM OLD.verification_submitted_at
  OR NEW.id_document_url           IS DISTINCT FROM OLD.id_document_url
  OR NEW.id_document_type          IS DISTINCT FROM OLD.id_document_type
  OR NEW.is_verified               IS DISTINCT FROM OLD.is_verified
  OR NEW.ai_review_result          IS DISTINCT FROM OLD.ai_review_result
  OR NEW.ai_review_flags           IS DISTINCT FROM OLD.ai_review_flags
  OR NEW.status                    IS DISTINCT FROM OLD.status
  OR NEW.deleted_at                IS DISTINCT FROM OLD.deleted_at
  OR NEW.membership_type           IS DISTINCT FROM OLD.membership_type
  THEN
    RAISE EXCEPTION 'profiles: protected column change is not allowed'
      USING ERRCODE = '42501';
  END IF;

  -- 性別：プロフィール完成後は元の値に戻す（エラーにしない＝保存処理を止めない）
  IF OLD.profile_initialized IS TRUE AND NEW.gender IS DISTINCT FROM OLD.gender THEN
    NEW.gender := OLD.gender;
  END IF;

  -- profile_initialized：完成→未完成には戻さない
  IF OLD.profile_initialized IS TRUE AND NEW.profile_initialized IS DISTINCT FROM TRUE THEN
    NEW.profile_initialized := TRUE;
  END IF;

  -- 生年月日：18歳未満になる変更だけ拒否
  IF NEW.birth_date IS DISTINCT FROM OLD.birth_date
     AND NEW.birth_date IS NOT NULL
     AND NEW.birth_date > (current_date - interval '18 years')::date
  THEN
    RAISE EXCEPTION 'profiles: birth_date must indicate age 18 or over'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_protect_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_columns();

-- ============================================================
-- 2. profiles：本人による削除を禁止（退会は service_role で実施）
-- ============================================================
DROP POLICY "Users can delete own profile" ON public.profiles;

-- ============================================================
-- 3. ブロック判定関数（自分と相手の間にブロック関係があるか）
--    blocks の RLS では「ブロックされた側」から行が見えないため、関数で判定する
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_blocked_with(other_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = other_user)
       OR (blocker_id = other_user AND blocked_id = auth.uid())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_blocked_with(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_with(uuid) TO authenticated;

-- ============================================================
-- 4. messages
-- ============================================================
-- 4-1 送信：従来の条件 ＋ 会話の参加者 ＋ ブロック関係なし
DROP POLICY messages_insert_participant ON public.messages;
CREATE POLICY messages_insert_participant ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.verification_status = 'approved'
  )
  AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.gender = 'female')
    OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status = 'active')
  )
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() IN (c.user1_id, c.user2_id)
      AND NOT public.is_blocked_with(
        CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END
      )
  )
);

-- 4-2 更新：送信者による更新を禁止。受信者は is_read / read_at のみ
DROP POLICY messages_update_sender ON public.messages;
REVOKE UPDATE ON public.messages FROM anon, authenticated;
GRANT UPDATE (is_read, read_at) ON public.messages TO authenticated;

-- 4-3 削除：禁止
DROP POLICY messages_delete_sender ON public.messages;
REVOKE DELETE ON public.messages FROM anon, authenticated;

-- 4-4 未ログインからの操作をすべて禁止
REVOKE ALL ON public.messages FROM anon;

-- ============================================================
-- 5. conversations：作成・更新・削除は service_role のみ
-- ============================================================
DROP POLICY conversations_insert_participant ON public.conversations;
DROP POLICY conversations_update_participant ON public.conversations;
DROP POLICY conversations_delete_participant ON public.conversations;
REVOKE INSERT, UPDATE, DELETE ON public.conversations FROM anon, authenticated;
REVOKE ALL ON public.conversations FROM anon;

-- ============================================================
-- 6. 最終メッセージ更新トリガー：送信時のみ ＋ プレビュー整形
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message = CASE
        WHEN NEW.image_url IS NOT NULL AND btrim(coalesce(NEW.content, '')) = '' THEN '📷 画像'
        WHEN char_length(NEW.content) > 50 THEN left(NEW.content, 50) || '…'
        ELSE NEW.content
      END,
      last_message_at = coalesce(NEW.created_at, now()),
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- ============================================================
-- 7. notifications：本人は閲覧と既読の切り替えのみ。作成は service_role
-- ============================================================
DROP POLICY allow_all_for_service_role ON public.notifications;
REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

CREATE POLICY notifications_select_own ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own ON public.notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. footprints：閲覧は自分宛てのみ
-- ============================================================
DROP POLICY "Anyone can view footprints" ON public.footprints;
REVOKE SELECT ON public.footprints FROM anon;
CREATE POLICY footprints_select_own ON public.footprints
FOR SELECT TO authenticated
USING (auth.uid() = profile_owner_id);

-- ============================================================
-- 9. 新規登録トリガー関数の安全設定
-- ============================================================
ALTER FUNCTION public.handle_new_user() SET search_path = public;

COMMIT;
