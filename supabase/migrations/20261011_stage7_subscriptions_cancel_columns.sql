-- stage7: サブスクの「期間の終わりに解約する予定」を記録する列を追加
-- 実行日: 2026-10-11
-- 背景: カスタマーポータルで「期間の終わりに解約」を予約しても、期間が終わるまで
--       status は 'active' のままで、DB からは予約したことが分からなかった。
--       マイページに「◯月◯日で解約予定」と表示するために記録する。
-- 実行前の確認結果: subscriptions の列は id, user_id, stripe_customer_id,
--   stripe_subscription_id, plan_type, status, current_period_end, created_at, updated_at
-- 影響: 列の追加のみ。既存の行は cancel_at_period_end = false、cancel_at = null になる。

BEGIN;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_at timestamptz;

COMMIT;

-- 確認（最後の 2 行に cancel_at_period_end と cancel_at が出れば OK）
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'subscriptions'
ORDER BY ordinal_position;
