-- stage8: Stripe の customer を 1 人 1 つに記録するテーブル
-- 実行日: 2026-10-11
-- 背景: 決済画面を開くたびに Stripe の customer が新しく作られ、同じ利用者の
--       customer が複数できていた（サンドボックスで 3 件の例を確認）。
--       今後は決済開始時にこのテーブルを最初に見て、あれば使い回す。
-- 書き込み・読み取り: サーバー（service_role）のみ。利用者からは読めない・書けない。
-- 既存データ: 移し替えはしない。コード側で subscriptions.stripe_customer_id を予備として見る。

BEGIN;

CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- RLS を有効にし、ポリシーは作らない（= 利用者の鍵では一切アクセスできない）
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- 二重の守り：利用者側のロールから権限そのものを外す
REVOKE ALL ON public.stripe_customers FROM anon, authenticated;

COMMIT;

-- 確認 1 本目（RLS が true、ポリシーが 0 件なら OK）
SELECT c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies WHERE tablename = 'stripe_customers') AS policy_count
FROM pg_class c
WHERE c.relname = 'stripe_customers';
