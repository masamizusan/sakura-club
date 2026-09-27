-- 段階1-B：チャット画像の非公開化と Storage ポリシーの整理（本番 Supabase で 2026-09-27 実行済み・記録用）
BEGIN;

-- 1. chat-images：非公開化とファイル制限
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'chat-images';

-- 2. chat-images：既存の「誰でも」ポリシーを削除
DROP POLICY "認証ユーザーは画像をアップロード可能" ON storage.objects;
DROP POLICY "画像は誰でも閲覧可能" ON storage.objects;

-- 3. chat-images：会話の参加者だけアップロード可（ブロック関係があれば不可）
CREATE POLICY chat_images_insert_participant ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND auth.uid() IN (c.user1_id, c.user2_id)
      AND NOT public.is_blocked_with(
        CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END
      )
  )
);

-- 4. chat-images：会話の参加者だけ閲覧可
CREATE POLICY chat_images_select_participant ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND auth.uid() IN (c.user1_id, c.user2_id)
  )
);

-- 5. avatars：一覧取得を自分のフォルダだけに絞る（公開URLでの表示は影響なし）
DROP POLICY "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY avatars_select_own_folder ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. 存在しない profile-images バケットのポリシーを削除
DROP POLICY profile_images_delete_policy ON storage.objects;
DROP POLICY profile_images_insert_policy ON storage.objects;
DROP POLICY profile_images_select_policy ON storage.objects;
DROP POLICY profile_images_update_policy ON storage.objects;

COMMIT;
