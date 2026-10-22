-- stage14: 会話ごとの最後のメッセージを、訳と一緒に 1 回で取る（#16 一覧のプレビューをチャットと同じく訳で表示する）
--
-- 返すもの（会話 ID の配列 → 会話ごとに最後のメッセージ 1 件）
--   原文・送信者 ID・画像だけか・送信時の訳（translated_content・translated_lang）・
--   受け手側の訳（message_translations の、p_language の訳）
--
-- 安全のための作り
--   ・SECURITY INVOKER（呼んだ人の権限で動く）。conversations・messages・message_translations の既存の RLS
--     （どれも「その会話の参加者だけ読める」）がそのまま効くので、呼んだ人（auth.uid()）が参加している会話の分しか返らない。
--     関数の中で参加者の確認を書き直すより、既にある RLS に任せる方が、決まりが 1 か所にまとまって安全なため
--   ・実行権限は authenticated だけ（stage11 の決まり：新しい関数は自動で権限が付かないので明示する）。PUBLIC・anon からは外す
--   ・既存のトリガー・テーブル・ポリシーは変えない
--   ・会話ごとに (conversation_id, created_at DESC) のインデックスで 1 件だけ読む（LATERAL ... LIMIT 1）

-- ============================================================
-- 実行前の確認（読み取りのみ）
-- ============================================================
-- 1) 関数がまだ無いこと（0 行なら OK）
-- SELECT proname FROM pg_proc
-- WHERE proname = 'get_conversation_last_messages' AND pronamespace = 'public'::regnamespace;
--
-- 2) 使う列が実在すること（スキーマ検証ルール）
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND (
--     (table_name = 'messages' AND column_name IN ('id','conversation_id','sender_id','content','image_url','translated_content','translated_lang','created_at'))
--     OR (table_name = 'message_translations' AND column_name IN ('message_id','language','translated_text'))
--   )
-- ORDER BY table_name, column_name;
-- → messages 8 行・message_translations 3 行（計 11 行）なら OK

BEGIN;

CREATE OR REPLACE FUNCTION public.get_conversation_last_messages(
  p_conversation_ids uuid[],
  p_language text DEFAULT NULL
)
RETURNS TABLE (
  conversation_id uuid,
  message_id uuid,
  sender_id uuid,
  content text,
  image_url text,
  is_image_only boolean,
  translated_content text,
  translated_lang text,
  receiver_translation text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    m.conversation_id::uuid,
    m.id::uuid,
    m.sender_id::uuid,
    m.content::text,
    m.image_url::text,
    (m.image_url IS NOT NULL AND btrim(coalesce(m.content, '')) = '') AS is_image_only,
    m.translated_content::text,
    m.translated_lang::text,
    mt.translated_text::text AS receiver_translation,
    m.created_at::timestamptz
  FROM (SELECT DISTINCT unnest(p_conversation_ids) AS id) AS c
  CROSS JOIN LATERAL (
    SELECT *
    FROM public.messages msg
    WHERE msg.conversation_id = c.id
    ORDER BY msg.created_at DESC, msg.id DESC
    LIMIT 1
  ) AS m
  LEFT JOIN public.message_translations mt
    ON mt.message_id = m.id
   AND p_language IS NOT NULL
   AND mt.language = p_language
$$;

REVOKE ALL ON FUNCTION public.get_conversation_last_messages(uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_last_messages(uuid[], text) TO authenticated;

COMMIT;

-- ============================================================
-- 実行後の確認（読み取りのみ）
-- ============================================================
-- 1) 権限：authenticated だけ true、anon は false
-- SELECT has_function_privilege('authenticated', 'public.get_conversation_last_messages(uuid[], text)', 'EXECUTE') AS authenticated_can,
--        has_function_privilege('anon', 'public.get_conversation_last_messages(uuid[], text)', 'EXECUTE') AS anon_can;
--
-- 2) TestWoman の会話で、会話ごとに 1 件ずつ出ること（SQL Editor は管理者権限で動くので RLS は効かない。中身の確認用）
--    <TestWoman の ID> を置き換える
-- SELECT conversation_id, sender_id, left(content, 30) AS content, is_image_only,
--        left(translated_content, 30) AS translated_content, translated_lang,
--        left(receiver_translation, 30) AS receiver_translation, created_at
-- FROM public.get_conversation_last_messages(
--   ARRAY(SELECT id FROM public.conversations
--         WHERE user1_id = '<TestWoman の ID>' OR user2_id = '<TestWoman の ID>'),
--   'ja'
-- );
--
-- 3) RLS が効くこと：「すべての会話の ID」を渡しても、TestWoman として呼ぶと TestWoman の会話の分しか返らない
--    （ID の一覧は役割を切り替える前に管理者権限で作る。最後に ROLLBACK するので何も変わらない）
-- BEGIN;
-- SELECT set_config('my.all_conv_ids', (SELECT string_agg(id::text, ',') FROM public.conversations), true);
-- SET LOCAL ROLE authenticated;
-- SELECT set_config('request.jwt.claims', json_build_object('sub', '<TestWoman の ID>', 'role', 'authenticated')::text, true);
-- SELECT count(*) AS rows_returned
-- FROM public.get_conversation_last_messages(string_to_array(current_setting('my.all_conv_ids'), ',')::uuid[], 'ja');
-- ROLLBACK;
-- → 2) の行数と同じなら OK（ほかの人の会話は返らない）
