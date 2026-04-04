-- 身分証認証カラムをprofilesテーブルに追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
  -- unverified / pending / approved / rejected / requires_review
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS id_document_type TEXT,
  ADD COLUMN IF NOT EXISTS ai_review_result JSONB,
  ADD COLUMN IF NOT EXISTS ai_review_flags TEXT[];

-- インデックス（管理者レビュー一覧取得用）
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
  ON public.profiles (verification_status)
  WHERE verification_status IS NOT NULL;

-- NOTE: identity-documents バケット（非公開）はSupabaseダッシュボードまたは以下のコマンドで作成してください:
-- Supabase Dashboard > Storage > New Bucket > Name: identity-documents > Public: OFF
