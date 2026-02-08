-- =============================================================================
-- likes テーブル作成（いいね機能）
-- 2026-02-08
-- =============================================================================

-- likesテーブル作成
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 同一ペアの重複いいねを防止（必要に応じて有効化）
  -- CONSTRAINT likes_unique_pair UNIQUE (liker_id, liked_user_id)

  -- 自分自身へのいいねを防止
  CONSTRAINT likes_no_self CHECK (liker_id <> liked_user_id)
);

-- インデックス作成（当日いいね数カウント用）
CREATE INDEX IF NOT EXISTS likes_liker_created_at_idx
  ON public.likes (liker_id, created_at DESC);

-- 相手からのいいね確認用インデックス
CREATE INDEX IF NOT EXISTS likes_liked_user_created_at_idx
  ON public.likes (liked_user_id, created_at DESC);

-- RLS有効化
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自分のいいねのみINSERT可能
CREATE POLICY "likes_insert_own"
ON public.likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = liker_id);

-- RLSポリシー: 自分がしたいいねのみSELECT可能
CREATE POLICY "likes_select_own_sent"
ON public.likes FOR SELECT
TO authenticated
USING (auth.uid() = liker_id);

-- RLSポリシー: 自分が受け取ったいいねもSELECT可能
CREATE POLICY "likes_select_own_received"
ON public.likes FOR SELECT
TO authenticated
USING (auth.uid() = liked_user_id);

-- コメント追加
COMMENT ON TABLE public.likes IS 'いいね記録テーブル（1日10回制限はアプリ側で制御）';
COMMENT ON COLUMN public.likes.liker_id IS 'いいねした人のユーザーID';
COMMENT ON COLUMN public.likes.liked_user_id IS 'いいねされた人のユーザーID';
COMMENT ON COLUMN public.likes.created_at IS 'いいね日時（Asia/Tokyo基準で日付判定に使用）';
