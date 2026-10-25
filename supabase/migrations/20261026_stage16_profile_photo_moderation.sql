-- stage16: プロフィール写真の AI 審査（#67）
--
-- 作るもの
--   1. profile_photo_flags：審査で引っかかった写真の記録（service_role だけが読み書き）
--   2. avatars-quarantine：隔離した写真の置き場所（非公開。大きさ・形式は avatars と同じ。ポリシーなし＝service_role だけ）
--   3. profiles のトリガー：photo_urls か avatar_url が変わったときだけ、pg_net で
--      https://sakura-club.vercel.app/api/internal/moderate-profile-photo を呼ぶ
--      ・送るのは id・photo_urls・avatar_url だけ（record と old_record）
--      ・合言葉は Vault（名前：profile_photo_moderation_secret）から読む。この SQL には書かない
--      ・pg_net は送信を予約するだけで待たない（保存の後に送られる）。関数の中の例外は捕まえて、保存は止めない
--
-- 前提：Vault に profile_photo_moderation_secret が登録済み（手順はチャット参照）。
--       未登録でも保存は止まらない（WARNING を出して何も送らない）

-- ============================================================
-- 実行前の確認（読み取りのみ。先頭の -- を外して実行）
-- ============================================================
-- 1) まだ作っていないこと（どれも 0 行なら OK）
-- SELECT to_regclass('public.profile_photo_flags') AS table_exists;  -- NULL なら OK
-- SELECT id FROM storage.buckets WHERE id = 'avatars-quarantine';
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'profiles_photo_moderation%';
--
-- 2) pg_net と Vault が使えること（2 行出れば OK）
-- SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_net', 'supabase_vault');
--
-- 3) Vault に合言葉が登録済みであること（1 行・has_value = true なら OK。値そのものは出さない）
-- SELECT name, decrypted_secret IS NOT NULL AND decrypted_secret <> '' AS has_value
-- FROM vault.decrypted_secrets WHERE name = 'profile_photo_moderation_secret';
--
-- 4) avatars バケットの設定（隔離用バケットに同じ値を写す）
-- SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'avatars';
--
-- 5) 使う列が実在すること（スキーマ検証ルール：3 行なら OK）
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
--   AND column_name IN ('id', 'photo_urls', 'avatar_url');

BEGIN;

-- ============================================================
-- 1. 審査の記録
-- ============================================================
CREATE TABLE public.profile_photo_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_path text NOT NULL,
  flag_type text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  detail text,
  status text NOT NULL DEFAULT 'pending',
  reviewed boolean NOT NULL DEFAULT false,
  quarantined boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profile_photo_flags_photo_path_idx ON public.profile_photo_flags (photo_path);
CREATE INDEX profile_photo_flags_reviewed_idx ON public.profile_photo_flags (reviewed, created_at DESC);

ALTER TABLE public.profile_photo_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_photo_flags FROM anon, authenticated;

-- ============================================================
-- 2. 隔離用バケット（大きさ・形式は avatars と同じ）
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'avatars-quarantine', 'avatars-quarantine', false, b.file_size_limit, b.allowed_mime_types
FROM storage.buckets b
WHERE b.id = 'avatars'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. profiles のトリガー
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_profile_photo_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_secret text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'profile_photo_moderation_secret'
    LIMIT 1;

    IF v_secret IS NULL OR v_secret = '' THEN
      RAISE WARNING 'notify_profile_photo_moderation: secret is not set in Vault';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := 'https://sakura-club.vercel.app/api/internal/moderate-profile-photo',
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', jsonb_build_object('id', NEW.id, 'photo_urls', NEW.photo_urls, 'avatar_url', NEW.avatar_url),
        'old_record', CASE WHEN TG_OP = 'UPDATE'
          THEN jsonb_build_object('id', OLD.id, 'photo_urls', OLD.photo_urls, 'avatar_url', OLD.avatar_url)
          ELSE NULL END
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- 審査の呼び出しに失敗しても、プロフィールの保存は止めない
    RAISE WARNING 'notify_profile_photo_moderation failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- トリガー専用。利用者のロールからは呼べないようにする（stage11 と同じ考え方）
REVOKE ALL ON FUNCTION public.notify_profile_photo_moderation() FROM PUBLIC, anon, authenticated;

-- 写真の列が変わったときだけ（last_seen_at などの更新では動かない）
CREATE TRIGGER profiles_photo_moderation_update
AFTER UPDATE OF photo_urls, avatar_url ON public.profiles
FOR EACH ROW
WHEN (OLD.photo_urls IS DISTINCT FROM NEW.photo_urls OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
EXECUTE FUNCTION public.notify_profile_photo_moderation();

CREATE TRIGGER profiles_photo_moderation_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.photo_urls IS NOT NULL OR NEW.avatar_url IS NOT NULL)
EXECUTE FUNCTION public.notify_profile_photo_moderation();

COMMIT;

-- ============================================================
-- 実行後の確認（読み取りのみ。先頭の -- を外して実行）
-- ============================================================
-- 1) テーブル：RLS が有効で、anon・authenticated に権限が無いこと
-- SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profile_photo_flags'::regclass;  -- true
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name = 'profile_photo_flags'
--   AND grantee IN ('anon', 'authenticated');  -- 0 行
--
-- 2) バケット：非公開で、avatars と同じ大きさ・形式
-- SELECT id, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets WHERE id IN ('avatars', 'avatars-quarantine');
--
-- 3) 隔離用バケットのポリシーが無いこと（0 行）
-- SELECT policyname FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
--   AND (qual LIKE '%avatars-quarantine%' OR with_check LIKE '%avatars-quarantine%');
--
-- 4) トリガーが 2 つあること
-- SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
-- WHERE tgrelid = 'public.profiles'::regclass AND tgname LIKE 'profiles_photo_moderation%';
--
-- 5) 関数の実行権限：authenticated・anon は false
-- SELECT has_function_privilege('authenticated', 'public.notify_profile_photo_moderation()', 'EXECUTE') AS authenticated_can,
--        has_function_privilege('anon', 'public.notify_profile_photo_moderation()', 'EXECUTE') AS anon_can;
--
-- 6) テストの後：トリガーからの送信の結果（新しい順。status_code が 200 なら API まで届いている）
-- SELECT id, status_code, left(content::text, 120) AS content, error_msg, created
-- FROM net._http_response ORDER BY created DESC LIMIT 10;
