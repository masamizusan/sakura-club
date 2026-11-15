-- 記録用（実行しない）：2026-11-16 時点の本番定義
-- 元データ：本番 Supabase から 2026-11-16 に取り出した定義（SQL 1〜7）を書き写したもの。推測では補っていない
-- 本番にはもうある。SQL Editor などで直接作られ、作成 SQL がリポジトリに無かった物の記録
-- 誤って実行しても残らないよう、全体を BEGIN; … ROLLBACK; で囲んでいる
-- 元データに無い情報は「-- 不明」と書いている
-- 内容：Storage avatars のポリシー 3 つ

BEGIN;

-- ============================================================
-- Storage（storage.objects）のポリシーのうち、作成 SQL がリポジトリに無かった avatars の 3 つ
-- （バケット 5 つと、ほかのポリシー 6 つは既存の migrations にある）
-- PERMISSIVE / RESTRICTIVE の別は元データに無い（不明。下は既定の PERMISSIVE として書いている）
-- ============================================================

CREATE POLICY "Users can delete own avatar images" ON storage.objects
  FOR DELETE TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can update own avatar images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload avatar images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

ROLLBACK;
