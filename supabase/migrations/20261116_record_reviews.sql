-- 記録用（実行しない）：2026-11-16 時点の本番定義
-- 元データ：本番 Supabase から 2026-11-16 に取り出した定義（SQL 1〜7）を書き写したもの。推測では補っていない
-- 本番にはもうある。SQL Editor などで直接作られ、作成 SQL がリポジトリに無かった物の記録
-- 誤って実行しても残らないよう、全体を BEGIN; … ROLLBACK; で囲んでいる
-- 元データに無い情報は「-- 不明」と書いている
-- 内容：reviews の表（列・制約・インデックス・ポリシー・権限）

BEGIN;

-- ============================================================
-- 表 public.reviews
-- ============================================================

CREATE TABLE public.reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  experience_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  is_anonymous boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_experience_id_reviewer_id_key UNIQUE (experience_id, reviewer_id);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));

ALTER TABLE public.reviews ADD CONSTRAINT reviews_experience_id_fkey FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ポリシー：なし（元データの 4a に行が無い。RLS 有効・ポリシーなし＝service_role 以外は読み書きできない）

GRANT DELETE, INSERT, SELECT, UPDATE ON public.reviews TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

ROLLBACK;
