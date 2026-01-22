-- ============================================================
-- TASK D: 画像削除証跡テーブル（profile_photo_cleanup_logs）
-- 目的: Storage画像削除の完了証拠を永続化する
-- ============================================================

-- 証跡テーブル作成
CREATE TABLE IF NOT EXISTS public.profile_photo_cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 削除対象情報
  deleted_paths TEXT[] NOT NULL DEFAULT '{}',
  requested_delete_count INTEGER NOT NULL DEFAULT 0,

  -- 実行前後の状態
  old_photo_urls TEXT[] DEFAULT '{}',
  new_photo_urls TEXT[] DEFAULT '{}',

  -- 結果
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,

  -- メタ情報
  entry_point TEXT,  -- 呼び出し元（preview_confirm, edit_save等）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス作成（user_id検索用）
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_user_id
  ON public.profile_photo_cleanup_logs(user_id);

-- インデックス作成（作成日時検索用）
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_created_at
  ON public.profile_photo_cleanup_logs(created_at DESC);

-- RLS有効化
ALTER TABLE public.profile_photo_cleanup_logs ENABLE ROW LEVEL SECURITY;

-- ポリシー: 認証ユーザーは自分のログのみ参照可能
CREATE POLICY "Users can view own cleanup logs"
  ON public.profile_photo_cleanup_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- ポリシー: 認証ユーザーは自分のログを作成可能
CREATE POLICY "Users can insert own cleanup logs"
  ON public.profile_photo_cleanup_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- コメント追加
COMMENT ON TABLE public.profile_photo_cleanup_logs IS 'TASK D: プロフィール画像削除の証跡ログ';
COMMENT ON COLUMN public.profile_photo_cleanup_logs.deleted_paths IS 'Storage上の削除対象パス一覧';
COMMENT ON COLUMN public.profile_photo_cleanup_logs.requested_delete_count IS '削除要求数';
COMMENT ON COLUMN public.profile_photo_cleanup_logs.old_photo_urls IS '削除前のphoto_urls';
COMMENT ON COLUMN public.profile_photo_cleanup_logs.new_photo_urls IS '削除後のphoto_urls';
COMMENT ON COLUMN public.profile_photo_cleanup_logs.success IS '削除成功フラグ';
COMMENT ON COLUMN public.profile_photo_cleanup_logs.error_message IS 'エラー発生時のメッセージ';
COMMENT ON COLUMN public.profile_photo_cleanup_logs.entry_point IS '呼び出し元識別子';
