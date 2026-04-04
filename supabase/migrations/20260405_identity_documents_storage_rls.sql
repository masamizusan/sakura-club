-- identity-documents バケットのRLSポリシー設定
-- 注意: バケット自体はSupabaseダッシュボードで事前に作成が必要です
-- Dashboard > Storage > New Bucket > Name: identity-documents > Public: OFF

-- ユーザーが自分のフォルダにアップロードできるポリシー
CREATE POLICY "Users can upload their own identity documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ユーザーが自分のファイルを参照できるポリシー（署名付きURL用）
CREATE POLICY "Users can view their own identity documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ユーザーが自分のファイルを削除できるポリシー（再アップロード対応）
CREATE POLICY "Users can delete their own identity documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Service Role（管理者API）はすべての操作が可能
-- Service Roleキーを使う場合はRLSをバイパスするため追加ポリシー不要
