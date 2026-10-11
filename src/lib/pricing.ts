// 料金の表示用定義（表示専用）
// 実際の請求額は Stripe の Price（src/app/api/stripe/ の Price ID・環境変数 STRIPE_PRICE_*）で決まる。
// このファイルは画面に出す金額をそろえるためだけのもので、Price ID の定義には触れない。
// Stripe の価格を変えたときは、ここも同じ値に更新すること。

export type SubscriptionPlanId = 'monthly' | '3month' | '6month' | 'yearly'
export type SakuraPack = 1 | 5 | 30

// サブスク：合計金額（USD）と月数
export const SUBSCRIPTION_PRICES: Record<SubscriptionPlanId, { totalUsd: number; months: number }> = {
  monthly: { totalUsd: 29.99, months: 1 },
  '3month': { totalUsd: 74.99, months: 3 },
  '6month': { totalUsd: 134.99, months: 6 },
  yearly: { totalUsd: 215.99, months: 12 },
}

// さくらいいね：パックの金額（USD）
export const SAKURA_PACK_PRICES: Record<SakuraPack, number> = {
  1: 3.99,
  5: 13.99,
  30: 49.99,
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// USD を「$25.00」の形に整形
export function formatUsd(amount: number): string {
  return usdFormatter.format(amount)
}

// 月あたりの額（合計 ÷ 月数）
export function getMonthlyEquivalentUsd(planId: SubscriptionPlanId): number {
  const { totalUsd, months } = SUBSCRIPTION_PRICES[planId]
  return totalUsd / months
}

// 割引率（%）：月額プラン × 月数 に対して何 % 安いか（整数に丸める）
export function getSavingsPercent(planId: SubscriptionPlanId): number {
  const { totalUsd, months } = SUBSCRIPTION_PRICES[planId]
  const base = SUBSCRIPTION_PRICES.monthly.totalUsd * months
  return Math.round((1 - totalUsd / base) * 100)
}

// さくらいいねの 1 枚あたりの額
export function getSakuraUnitPriceUsd(pack: SakuraPack): number {
  return SAKURA_PACK_PRICES[pack] / pack
}
