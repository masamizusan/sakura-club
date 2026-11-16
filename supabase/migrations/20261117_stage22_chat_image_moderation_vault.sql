-- stage22: チャット画像の AI 審査の合言葉を Vault から読む形に作り替える
-- 作成日: 2026-11-17（実行はプロダクトオーナーが Supabase の SQL Editor で行う）
--
-- 目的
--   messages のトリガー moderate_chat_image は、Dashboard の Database Webhooks で作った
--   supabase_functions.http_request で、合言葉（x-webhook-secret）の値をトリガーの定義に直接書き込んでいた。
--   その値が外から見える状態になったため、
--   ・新しい合言葉を Vault（名前：chat_image_moderation_secret）に置き、関数 notify_chat_image_moderation が読む形にする
--     （プロフィール写真の notify_profile_photo_moderation〔stage16〕と同じ形）
--   ・古いトリガーを消して作り直す＝古い合言葉をトリガーの定義ごと消す
--   ・ついでに、画像のメッセージのときだけ送る（WHEN (NEW.image_url IS NOT NULL)）。
--     送る record は id と image_url だけ（受け側の API はこの 2 つしか使わず、中身は DB から読み直している）
--
-- 前提（この SQL を実行する前に済ませておくこと）
--   1. 新しい合言葉を手元で作る（例：openssl rand -hex 32）。チャット・ファイルには貼らない
--   2. Dashboard の Vault 画面で、名前 chat_image_moderation_secret として登録する
--      （SQL Editor で vault.create_secret を使うと実行の履歴に値が残るため、Vault 画面から入れる）
--   3. Vercel の CHAT_IMAGE_MODERATION_SECRET（Production）を同じ新しい値にして、デプロイし直す
--      → この時点から古いトリガーの送信は 401 になる。すぐ下の 0 → 1 → 2 を続けて実行する
--      → 3 から 1 までの数分間に送られた画像は審査されない（見えたまま・記録なし）。その間は画像を送らない
--
-- 実行の順番
--   0（実行前の確認）→ 1（作り替え。BEGIN から COMMIT まで一緒に実行）→ 2（実行後の確認）→ 本番テスト
--   必要なら 4（切り替え中に審査されなかった画像を数える）
--
-- この SQL に合言葉の値は書かない。確認の SELECT も、値やトリガーの定義そのものは出さない（true / false だけ）

-- ============================================================
-- 0. 実行前の確認（読み取りのみ。1 本ずつ実行）
-- ============================================================

-- 0-1) pg_net と Vault が使えること
--      期待：2 行（pg_net・supabase_vault）
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_net', 'supabase_vault');

-- 0-2) Vault に新しい合言葉が登録済みであること（値そのものは出さない）
--      期待：1 行・has_value = true
SELECT name,
       decrypted_secret IS NOT NULL AND decrypted_secret <> '' AS has_value
FROM vault.decrypted_secrets
WHERE name = 'chat_image_moderation_secret';

-- 0-3) 今のトリガーが古い webhook（supabase_functions.http_request）であること（定義そのものは出さない）
--      期待：1 行・is_old_webhook = true、uses_vault = false
SELECT tgname,
       pg_get_triggerdef(oid) LIKE '%supabase_functions.http_request%' AS is_old_webhook,
       pg_get_triggerdef(oid) LIKE '%notify_chat_image_moderation%' AS uses_vault
FROM pg_trigger
WHERE tgrelid = 'public.messages'::regclass
  AND tgname = 'moderate_chat_image'
  AND NOT tgisinternal;

-- 0-4) 使う列が実在すること（スキーマ検証ルール）
--      期待：2 行（id・image_url）
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messages'
  AND column_name IN ('id', 'image_url');

-- ============================================================
-- 1. 作り替え（BEGIN から COMMIT まで一緒に実行する）
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.notify_chat_image_moderation()
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
    WHERE name = 'chat_image_moderation_secret'
    LIMIT 1;

    IF v_secret IS NULL OR v_secret = '' THEN
      RAISE WARNING 'notify_chat_image_moderation: secret is not set in Vault';
      RETURN NEW;
    END IF;

    -- 受け側（/api/internal/moderate-chat-image）は type = 'INSERT'・table = 'messages'・record.id・record.image_url を見る。
    -- Database Webhooks と同じ見出し（type・table・schema・record・old_record）を残し、record は id と image_url だけ
    PERFORM net.http_post(
      url := 'https://sakura-club.vercel.app/api/internal/moderate-chat-image',
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', jsonb_build_object('id', NEW.id, 'image_url', NEW.image_url),
        'old_record', NULL
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- 審査の呼び出しに失敗しても、メッセージの保存は止めない
    RAISE WARNING 'notify_chat_image_moderation failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- トリガー専用。利用者のロールからは呼べないようにする（stage11・stage16 と同じ考え方）
REVOKE ALL ON FUNCTION public.notify_chat_image_moderation() FROM PUBLIC, anon, authenticated;

-- 古いトリガー（合言葉の値を定義に書き込んだ Database Webhook）を消して、Vault から読む形で作り直す
DROP TRIGGER IF EXISTS moderate_chat_image ON public.messages;

CREATE TRIGGER moderate_chat_image
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.image_url IS NOT NULL)
EXECUTE FUNCTION public.notify_chat_image_moderation();

COMMIT;

-- ============================================================
-- 2. 実行後の確認（読み取りのみ。1 本ずつ実行）
-- ============================================================

-- 2-1) トリガーが新しい関数を使い、定義に合言葉が無いこと
--      期待：1 行・uses_vault = true、no_secret_in_def = true
SELECT tgname,
       pg_get_triggerdef(oid) LIKE '%notify_chat_image_moderation%' AS uses_vault,
       pg_get_triggerdef(oid) NOT LIKE '%x-webhook-secret%' AS no_secret_in_def
FROM pg_trigger
WHERE tgrelid = 'public.messages'::regclass
  AND tgname = 'moderate_chat_image'
  AND NOT tgisinternal;

-- 2-2) 利用者のロールから関数を実行できないこと
--      期待：anon_exec = false、authenticated_exec = false
SELECT has_function_privilege('anon', 'public.notify_chat_image_moderation()', 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', 'public.notify_chat_image_moderation()', 'EXECUTE') AS authenticated_exec;

-- 2-3) 本番テスト：テスト用の利用者でチャットに画像を 1 枚送ってから、すぐに実行
--      （net._http_response は既定で 6 時間ほどで消える）
--      期待：いちばん新しい行が status_code = 200 で、中身に "result" が入っている。401 なら Vault と Vercel の値が食い違っている
-- SELECT id, status_code, created, left(content::text, 80) AS content_head
-- FROM net._http_response
-- ORDER BY created DESC
-- LIMIT 5;

-- ============================================================
-- 3. 元に戻すとき（コメントのみ。合言葉の値が要るので、SQL ファイルには書かない）
-- ============================================================
-- 1) 新しいトリガーと関数を消す
--    BEGIN;
--    DROP TRIGGER IF EXISTS moderate_chat_image ON public.messages;
--    DROP FUNCTION IF EXISTS public.notify_chat_image_moderation();
--    COMMIT;
-- 2) Dashboard の Database → Webhooks で、webhook を作り直す
--    ・名前 moderate_chat_image、テーブル public.messages、イベント INSERT
--    ・種類 HTTP Request、メソッド POST、URL https://sakura-club.vercel.app/api/internal/moderate-chat-image
--    ・ヘッダ Content-type: application/json と x-webhook-secret: <Vercel と同じ新しい値>（Dashboard の画面で直接入れる）
--    ・タイムアウト 5000 ms

-- ============================================================
-- 4. 切り替え中に審査されなかった画像を数える（読み取りのみ。必要なときだけ）
-- ============================================================
-- <切り替えを始めた時刻> に、Vercel の値を入れ替えた時刻（例：'2026-11-17 10:00:00+09'）を入れて実行する
-- 「問題なし」と判定された画像は記録が残らないため、この数には問題なしの画像も入る
-- SELECT count(*) AS images_without_flag
-- FROM public.messages m
-- WHERE m.image_url IS NOT NULL
--   AND m.created_at > '<切り替えを始めた時刻>'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.message_flags f
--     WHERE f.message_id = m.id
--       AND f.flag_type LIKE 'image\_%'
--   );
