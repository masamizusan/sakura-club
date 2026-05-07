-- 退会者の違反履歴アーカイブテーブル
-- 退会時に reports と message_flags からスナップショットを保存
-- profiles 削除後も運営側の証跡として永続保持

CREATE TABLE IF NOT EXISTS public.archived_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 退会前のユーザー識別情報（スナップショット）
  original_user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  user_gender TEXT,
  user_nationality TEXT,

  -- 違反種別
  -- 'reported': 通報を受けた（reports テーブルから）
  -- 'flagged': AI フラグが立った（message_flags テーブルから）
  violation_type TEXT NOT NULL CHECK (violation_type IN ('reported', 'flagged')),

  -- 元レコードの状態
  -- reports.status または message_flags.status の値
  -- 'pending' / 'reviewed' / 'warned' / 'suspended' / 'resolved' 等
  original_status TEXT,

  -- 違反内容のスナップショット（JSONB）
  -- reports の場合: { reason, details, reporter_id, ... }
  -- message_flags の場合: { categories, score, message_content, ... }
  violation_content JSONB NOT NULL,

  -- 元レコードの作成日時
  original_created_at TIMESTAMPTZ,

  -- アーカイブ実行日時
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_archived_violations_user_email
  ON public.archived_violations(user_email);
CREATE INDEX IF NOT EXISTS idx_archived_violations_archived_at
  ON public.archived_violations(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_violations_original_user_id
  ON public.archived_violations(original_user_id);

-- RLS
ALTER TABLE public.archived_violations ENABLE ROW LEVEL SECURITY;

-- 一般ユーザーはアクセス不可（service_role と admin のみ閲覧可能）
-- 後日 admin 管理画面で参照する際は service_role 経由

COMMENT ON TABLE public.archived_violations IS
  '退会者の違反履歴アーカイブ。profiles 削除後も運営側の証跡として保持。';
