-- ===========================================================================
-- 退会フロー フェーズ1：profiles テーブルに account status を追加
--
-- 目的:
--   self-leave（ユーザー自身の退会）を表現する論理削除カラムを追加する。
--   既存の is_active（管理者の停止に使う）とは独立した別軸で管理する。
--     - is_active=false : 管理者が停止 (/suspended ページ)
--     - status='deleted_pending' : ユーザー自身の退会 (30日猶予)
--     - status='deleted_permanent' : 30日経過後の物理削除前段階
--
-- フェーズ:
--   フェーズ1: status カラム追加 + 退会API + middleware分岐 (本マイグレーションの守備範囲)
--   フェーズ3 (将来): cron で deleted_pending → deleted_permanent → 物理削除
--
-- 参考: CLAUDE.md「マルチタブ認証制御」「is_active=false ユーザーを /suspended」
-- ===========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'deleted_pending', 'deleted_permanent', 'suspended'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- middleware が status を毎リクエストで読みに行くため、index で軽量化
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 既存ユーザーは全員 active のまま
COMMENT ON COLUMN public.profiles.status IS 'Account lifecycle: active | deleted_pending (self-leave, 30day grace) | deleted_permanent | suspended';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Set when status moves out of active. Used to compute the 30-day permanent-delete deadline.';
