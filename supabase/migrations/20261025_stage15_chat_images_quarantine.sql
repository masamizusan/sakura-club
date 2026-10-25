-- stage15: チャット画像の隔離用バケット（#17 チャット画像の AI 審査）
--
-- 作るもの
--   chat-images-quarantine：AI 審査で隔離した画像の置き場所（chat-images と同じパスに置く）
--   ・非公開（public = false）、10MB、jpeg / png / webp / gif（chat-images と同じ制限）
--   ・ポリシーは作らない＝利用者（anon・authenticated）は読めず、service_role（サーバー）だけが使える
--
-- 使うところ
--   src/app/api/internal/moderate-chat-image/route.ts（隔離する）
--   src/app/api/admin/flags/route.ts（管理画面で表示する。requireAdmin の後に service_role で署名）

-- ============================================================
-- 実行前の確認（読み取りのみ）
-- ============================================================
-- 1) バケットがまだ無いこと（0 行なら OK）
-- SELECT id FROM storage.buckets WHERE id = 'chat-images-quarantine';
--
-- 2) message_flags の列と制約（flag_type に CHECK 制約があると image_* が保存できない）
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'message_flags'
-- ORDER BY ordinal_position;
-- SELECT conname, pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint WHERE conrelid = 'public.message_flags'::regclass;
-- → flag_type・score・detail・reviewed・status・message_id があり、flag_type を限る CHECK が無ければ OK

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images-quarantine',
  'chat-images-quarantine',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================
-- 実行後の確認（読み取りのみ）
-- ============================================================
-- 1) バケットの設定：public = false、10485760、4 形式
-- SELECT id, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets WHERE id IN ('chat-images', 'chat-images-quarantine');
--
-- 2) このバケットのポリシーが無いこと（0 行なら OK）
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
--   AND (qual LIKE '%chat-images-quarantine%' OR with_check LIKE '%chat-images-quarantine%');
