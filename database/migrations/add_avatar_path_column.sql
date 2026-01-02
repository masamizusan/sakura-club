-- 🔄 段階的移行: profiles.avatar_path カラム追加（安全版）
-- 目的：DBのBase64画像保存をやめてStorageへ移行（現在安定している動作を崩さず）

-- avatar_path カラム追加（Storage pathのみ保存）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_path TEXT;

-- インデックス追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_path ON profiles(avatar_path) WHERE avatar_path IS NOT NULL;

-- コメント追加（運用時の理解促進）
COMMENT ON COLUMN public.profiles.avatar_path IS '段階的移行: Storage path保存用（新規アップロード優先）';
COMMENT ON COLUMN public.profiles.avatar_url IS '既存: Base64/HTTP/Storage path互換（段階的移行中はfallback用）';