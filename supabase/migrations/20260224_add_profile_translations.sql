-- Profile translations cache table
-- AI翻訳結果をキャッシュし、同一内容の再翻訳を防ぐ

CREATE TABLE IF NOT EXISTS public.profile_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field TEXT NOT NULL DEFAULT 'bio',
  target_lang TEXT NOT NULL CHECK (target_lang IN ('ja', 'en', 'ko', 'zh')),
  source_hash TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 同一ユーザー・フィールド・言語・ハッシュの組み合わせはユニーク
  UNIQUE (user_id, field, target_lang, source_hash)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_profile_translations_lookup
  ON public.profile_translations (user_id, field, target_lang, source_hash);

-- RLS有効化
ALTER TABLE public.profile_translations ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（認証ユーザーは全員読める）
CREATE POLICY "Authenticated users can read translations"
  ON public.profile_translations
  FOR SELECT
  TO authenticated
  USING (true);

-- 挿入ポリシー（サーバーサイドのみ＝service_roleで挿入）
-- 通常のauthenticatedユーザーは挿入不可（APIサーバー経由のみ）
CREATE POLICY "Service role can insert translations"
  ON public.profile_translations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_profile_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_translations_updated_at
  BEFORE UPDATE ON public.profile_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_translations_updated_at();

COMMENT ON TABLE public.profile_translations IS 'AI翻訳結果のキャッシュテーブル';
