'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const translations = {
  ja: {
    title: 'プレミアムプランに登録',
    subtitle: '日本人女性とメッセージを楽しもう',
    recommendedLabel: 'おすすめ',
    plans: [
      { id: 'monthly', label: '月額', price: '$29.99', period: '/月', savings: '', recommended: false },
      { id: '3month', label: '3ヶ月', price: '$74.99', period: '/3ヶ月', savings: '17% お得', recommended: true },
      { id: '6month', label: '6ヶ月', price: '$134.99', period: '/6ヶ月', savings: '25% お得', recommended: false },
      { id: 'yearly', label: '年額', price: '$215.99', period: '/年', savings: '40% お得 🌸', recommended: false },
    ],
    subscribe: '登録する',
    loading: '処理中...',
    close: '閉じる',
    perMonth: '月換算',
    monthlyRates: ['$29.99', '$25.00', '$22.50', '$18.00'],
  },
  en: {
    title: 'Get Premium Access',
    subtitle: 'Start messaging with Japanese women',
    recommendedLabel: 'Popular',
    plans: [
      { id: 'monthly', label: 'Monthly', price: '$29.99', period: '/mo', savings: '', recommended: false },
      { id: '3month', label: '3 Months', price: '$74.99', period: '/3mo', savings: 'Save 17%', recommended: true },
      { id: '6month', label: '6 Months', price: '$134.99', period: '/6mo', savings: 'Save 25%', recommended: false },
      { id: 'yearly', label: 'Annual', price: '$215.99', period: '/yr', savings: 'Save 40% 🌸', recommended: false },
    ],
    subscribe: 'Subscribe',
    loading: 'Processing...',
    close: 'Close',
    perMonth: 'per month',
    monthlyRates: ['$29.99', '$25.00', '$22.50', '$18.00'],
  },
  ko: {
    title: '프리미엄 플랜 가입',
    subtitle: '일본 여성과 메시지를 나눠보세요',
    recommendedLabel: '추천',
    plans: [
      { id: 'monthly', label: '월간', price: '$29.99', period: '/월', savings: '', recommended: false },
      { id: '3month', label: '3개월', price: '$74.99', period: '/3개월', savings: '17% 절약', recommended: true },
      { id: '6month', label: '6개월', price: '$134.99', period: '/6개월', savings: '25% 절약', recommended: false },
      { id: 'yearly', label: '연간', price: '$215.99', period: '/년', savings: '40% 절약 🌸', recommended: false },
    ],
    subscribe: '가입하기',
    loading: '처리 중...',
    close: '닫기',
    perMonth: '월 환산',
    monthlyRates: ['$29.99', '$25.00', '$22.50', '$18.00'],
  },
  'zh-tw': {
    title: '加入高級方案',
    subtitle: '開始與日本女性傳送訊息',
    recommendedLabel: '推薦',
    plans: [
      { id: 'monthly', label: '月繳', price: '$29.99', period: '/月', savings: '', recommended: false },
      { id: '3month', label: '3個月', price: '$74.99', period: '/3個月', savings: '省17%', recommended: true },
      { id: '6month', label: '6個月', price: '$134.99', period: '/6個月', savings: '省25%', recommended: false },
      { id: 'yearly', label: '年繳', price: '$215.99', period: '/年', savings: '省40% 🌸', recommended: false },
    ],
    subscribe: '立即訂閱',
    loading: '處理中...',
    close: '關閉',
    perMonth: '每月折算',
    monthlyRates: ['$29.99', '$25.00', '$22.50', '$18.00'],
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
          {t.plans.map((plan, idx) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                selectedPlan === plan.id
                  ? 'border-pink-400 bg-pink-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{plan.label}</span>
                  {plan.recommended && (
                    <span className="text-xs bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2 py-0.5 rounded-full font-medium">
                      {t.recommendedLabel}
                    </span>
                  )}
                  {plan.savings && (
                    <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                      {plan.savings}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {t.perMonth}: {t.monthlyRates[idx]}
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900">{plan.price}</span>
                <span className="text-xs text-gray-500">{plan.period}</span>
              </div>
            </button>
          ))}
        </div>

        {/* 登録ボタン */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-semibold text-base hover:opacity-90 transition disabled:opacity-60"
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
