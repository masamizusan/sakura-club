'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  SUBSCRIPTION_PRICES,
  formatUsd,
  getMonthlyEquivalentUsd,
  getSavingsPercent,
  type SubscriptionPlanId,
} from '@/lib/pricing'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type ModalPlan = {
  id: SubscriptionPlanId
  label: string
  period: string
  recommended: boolean
  flower?: boolean
}

const translations: Record<'ja' | 'en' | 'ko' | 'zh-tw', {
  title: string
  subtitle: string
  recommendedLabel: string
  plans: ModalPlan[]
  subscribe: string
  loading: string
  close: string
  perMonth: string
  savingsTemplate: string
  approxTemplate: string
}> = {
  ja: {
    title: 'プレミアムプランに登録',
    subtitle: '日本人女性とメッセージを楽しもう',
    recommendedLabel: 'おすすめ',
    plans: [
      { id: 'monthly', label: '月額', period: '/月', recommended: false },
      { id: '3month', label: '3ヶ月', period: '/3ヶ月', recommended: true },
      { id: '6month', label: '6ヶ月', period: '/6ヶ月', recommended: false },
      { id: 'yearly', label: '年額', period: '/年', recommended: false, flower: true },
    ],
    subscribe: '登録する',
    loading: '処理中...',
    close: '閉じる',
    perMonth: '月換算',
    // 金額・月換算・割引率は src/lib/pricing.ts から計算する（{pct}・{price} を置き換え）
    savingsTemplate: '{pct}% お得',
    approxTemplate: '約{price}',
  },
  en: {
    title: 'Get Premium Access',
    subtitle: 'Start messaging with Japanese women',
    recommendedLabel: 'Popular',
    plans: [
      { id: 'monthly', label: 'Monthly', period: '/mo', recommended: false },
      { id: '3month', label: '3 Months', period: '/3mo', recommended: true },
      { id: '6month', label: '6 Months', period: '/6mo', recommended: false },
      { id: 'yearly', label: 'Annual', period: '/yr', recommended: false, flower: true },
    ],
    subscribe: 'Subscribe',
    loading: 'Processing...',
    close: 'Close',
    perMonth: 'per month',
    // 金額・月換算・割引率は src/lib/pricing.ts から計算する（{pct}・{price} を置き換え）
    savingsTemplate: 'Save {pct}%',
    approxTemplate: '≈ {price}',
  },
  ko: {
    title: '프리미엄 플랜 가입',
    subtitle: '일본 여성과 메시지를 나눠보세요',
    recommendedLabel: '추천',
    plans: [
      { id: 'monthly', label: '월간', period: '/월', recommended: false },
      { id: '3month', label: '3개월', period: '/3개월', recommended: true },
      { id: '6month', label: '6개월', period: '/6개월', recommended: false },
      { id: 'yearly', label: '연간', period: '/년', recommended: false, flower: true },
    ],
    subscribe: '가입하기',
    loading: '처리 중...',
    close: '닫기',
    perMonth: '월 환산',
    // 金額・月換算・割引率は src/lib/pricing.ts から計算する（{pct}・{price} を置き換え）
    savingsTemplate: '{pct}% 절약',
    approxTemplate: '약 {price}',
  },
  'zh-tw': {
    title: '加入高級方案',
    subtitle: '開始與日本女性傳送訊息',
    recommendedLabel: '推薦',
    plans: [
      { id: 'monthly', label: '月繳', period: '/月', recommended: false },
      { id: '3month', label: '3個月', period: '/3個月', recommended: true },
      { id: '6month', label: '6個月', period: '/6個月', recommended: false },
      { id: 'yearly', label: '年繳', period: '/年', recommended: false, flower: true },
    ],
    subscribe: '立即訂閱',
    loading: '處理中...',
    close: '關閉',
    perMonth: '每月折算',
    // 金額・月換算・割引率は src/lib/pricing.ts から計算する（{pct}・{price} を置き換え）
    savingsTemplate: '省{pct}%',
    approxTemplate: '約 {price}',
  },
}

export default function SubscriptionModal({ isOpen, onClose }: Props) {
  const { currentLanguage } = useLanguage()
  const t = translations[currentLanguage as keyof typeof translations] || translations.en
  const [selectedPlan, setSelectedPlan] = useState('3month')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: selectedPlan }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌸</div>
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        {/* プランカード */}
        <div className="space-y-3 mb-6">
          {t.plans.map((plan) => {
            // 合計は正式な価格、月換算は計算値（月額プラン以外は「約」を付ける）
            const priceText = formatUsd(SUBSCRIPTION_PRICES[plan.id].totalUsd)
            const monthlyText = formatUsd(getMonthlyEquivalentUsd(plan.id))
            const monthlyRateText = plan.id === 'monthly'
              ? monthlyText
              : t.approxTemplate.replace('{price}', monthlyText)
            const savingsPercent = getSavingsPercent(plan.id)
            const savingsText = plan.id !== 'monthly' && savingsPercent > 0
              ? `${t.savingsTemplate.replace('{pct}', String(savingsPercent))}${plan.flower ? ' 🌸' : ''}`
              : ''
            return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                selectedPlan === plan.id
                  ? 'border-[#8b1a2e] bg-[#fdf6ef]'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{plan.label}</span>
                  {plan.recommended && (
                    <span className="text-xs text-white px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--color-primary)' }}>
                      {t.recommendedLabel}
                    </span>
                  )}
                  {savingsText && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-primary)' }}>
                      {savingsText}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {t.perMonth}: {monthlyRateText}
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900">{priceText}</span>
                <span className="text-xs text-gray-500">{plan.period}</span>
              </div>
            </button>
            )
          })}
        </div>

        {/* 登録ボタン */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full btn-primary py-3 rounded-xl font-semibold text-base transition disabled:opacity-60"
        >
          {loading ? t.loading : t.subscribe}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2"
        >
          {t.close}
        </button>
      </div>
    </div>
  )
}
