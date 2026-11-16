-- 記録用（実行しない）：2026-11-16 時点の本番定義
-- 元データ：本番 Supabase から 2026-11-16 に取り出した定義（SQL 1〜7）を書き写したもの。推測では補っていない
-- 本番にはもうある。SQL Editor などで直接作られ、作成 SQL がリポジトリに無かった物の記録
-- 誤って実行しても残らないよう、全体を BEGIN; … ROLLBACK; で囲んでいる
-- 元データに無い情報は「-- 不明」と書いている
-- 内容：表 user_likes（定義は 2026-11-17 に追加で取り出したもの）

BEGIN;

-- ============================================================
-- 表 public.user_likes（取得日 2026-11-17）
-- 本番の一覧（元データ SQL 1）に表として存在し、RLS は有効（rls_enabled=true）
-- コードからは使われていない（src/ に .from('user_likes') は無い）
-- ============================================================

CREATE TABLE public.user_likes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  liker_id uuid NOT NULL,
  liked_id uuid NOT NULL,
  liked boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.user_likes ADD CONSTRAINT user_likes_pkey PRIMARY KEY (id);
ALTER TABLE public.user_likes ADD CONSTRAINT user_likes_liker_id_liked_id_key UNIQUE (liker_id, liked_id);
ALTER TABLE public.user_likes ADD CONSTRAINT user_likes_check CHECK ((liker_id <> liked_id));
ALTER TABLE public.user_likes ADD CONSTRAINT user_likes_liker_id_fkey FOREIGN KEY (liker_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_likes ADD CONSTRAINT user_likes_liked_id_fkey FOREIGN KEY (liked_id) REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX idx_user_likes_liked ON public.user_likes USING btree (liked_id);
CREATE INDEX idx_user_likes_liker ON public.user_likes USING btree (liker_id);
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;
-- ポリシー：なし（RLS 有効・ポリシーなし＝service_role 以外は読み書きできない）
-- データ件数：0（2026-11-17 時点）
-- 権限・トリガー：今回は取り出していない（不明）
-- メモ：コードから使われていない旧テーブル。公開前に削除を検討（今は消さない）

ROLLBACK;
