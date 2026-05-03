-- ===========================================================================
-- 退会フロー フェーズ1：leave_surveys テーブル新規作成
--
-- 目的:
--   退会前アンケートで集めた「理由」「ご意見」をサービス改善のため保管する。
--   profiles を物理削除した後でも参照できるよう、user_id は ON DELETE SET NULL とし、
--   ユーザー属性のスナップショットを別カラムに保持する。
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.leave_surveys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 退会時点のユーザー属性スナップショット（物理削除後も参照可能）
  user_email      TEXT,
  user_nickname   TEXT,
  user_gender     TEXT,
  user_nationality TEXT,
  -- アンケート回答
  reasons         TEXT[] NOT NULL,
  feedback        TEXT NOT NULL CHECK (char_length(trim(feedback)) >= 10),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_surveys_created_at ON public.leave_surveys(created_at DESC);

-- RLS: 認証ユーザー本人のみ INSERT 可能
-- SELECT は service_role 経由（admin API）でのみ行う想定で、anon/auth role には開けない
ALTER TABLE public.leave_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own leave survey"
  ON public.leave_surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.leave_surveys IS 'Self-leave (退会) survey responses. Persisted across profile deletion via stored snapshots.';
