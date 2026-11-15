-- 記録用（実行しない）：2026-11-16 時点の本番定義
-- 元データ：本番 Supabase から 2026-11-16 に取り出した定義（SQL 1〜7）を書き写したもの。推測では補っていない
-- 本番にはもうある。SQL Editor などで直接作られ、作成 SQL がリポジトリに無かった物の記録
-- 誤って実行しても残らないよう、全体を BEGIN; … ROLLBACK; で囲んでいる
-- 元データに無い情報は「-- 不明」と書いている
-- 内容：subscriptions の表（列・制約・インデックス・ポリシー・権限）

BEGIN;

-- ============================================================
-- 表 public.subscriptions
-- ============================================================

CREATE TABLE public.subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_type text,
  status text DEFAULT 'inactive'::text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cancel_at_period_end boolean DEFAULT false NOT NULL,
  cancel_at timestamp with time zone
);

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check CHECK ((plan_type = ANY (ARRAY['monthly'::text, '3month'::text, '6month'::text, 'yearly'::text])));

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'trialing'::text, 'inactive'::text])));

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX subscriptions_user_id_idx ON public.subscriptions USING btree (user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ポリシー（PERMISSIVE / RESTRICTIVE の別は元データに無い：不明。下は既定の PERMISSIVE として書いている）

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Users can read own subscription" ON public.subscriptions
  FOR SELECT TO public
  USING ((auth.uid() = user_id));

GRANT DELETE, INSERT, SELECT, UPDATE ON public.subscriptions TO authenticated;

-- anon の権限：なし（元データ 5b）／ service_role の権限：元データに無い（不明）

ROLLBACK;
