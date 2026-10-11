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
import { savePaymentReturn } from '@/lib/paymentReturn'

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
  alreadySubscribed: string
  notEligible: string
  accountSuspended: string
  checkoutError: string
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
    alreadySubscribed: 'すでに有料プランにご加入中です。お支払い・プランの管理からご確認ください。',
    notEligible: 'このアカウントでは有料プランをお申し込みいただけません。',
    accountSuspended: 'アカウントが停止されているため、お申し込みいただけません。',
    checkoutError: '購入手続きを開始できませんでした。時間をおいて再度お試しください。',
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
    alreadySubscribed: 'You already have an active plan. Please check "Manage billing & plan".',
    notEligible: "This account isn't eligible for a paid plan.",
    accountSuspended: 'Your account is suspended, so you cannot subscribe.',
    checkoutError: 'Could not start checkout. Please try again later.',
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
    alreadySubscribed: '이미 유료 플랜에 가입되어 있습니다. "결제·플랜 관리"에서 확인해 주세요.',
    notEligible: '이 계정으로는 유료 플랜을 신청할 수 없습니다.',
    accountSuspended: '계정이 정지되어 있어 신청할 수 없습니다.',
    checkoutError: '결제를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.',
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
    alreadySubscribed: '您已加入付費方案。請至「付款與方案管理」確認。',
    notEligible: '此帳號無法申請付費方案。',
    accountSuspended: '您的帳號已被停權，無法申請。',
    checkoutError: '無法開始結帳，請稍後再試。',
  },
}

export default function SubscriptionModal({ isOpen, onClose }: Props) {
  const { currentLanguage } = useLanguage()
  const t = translations[currentLanguage as keyof typeof translations] || translations.en
  const [selectedPlan, setSelectedPlan] = useState('3month')
  const [loading, setLoading] = useState(false)
  // #2-3: 決済開始が拒否・失敗したときのエラー文
  const [errorText, setErrorText] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubscribe = async () => {
    setLoading(true)
    setErrorText(null)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: selectedPlan }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        // #41: 決済のキャンセル・完了後は、今の会話に戻す
        savePaymentReturn(window.location.pathname)
        window.location.href = data.url
        return
      }
      // #2-3: 拒否・失敗の理由をモーダル内に表示する
      setErrorText(
        data.code === 'already_subscribed' ? t.alreadySubscribed
          : data.code === 'not_eligible' ? t.notEligible
          : data.code === 'account_suspended' ? t.accountSuspended
          : t.checkoutError
      )
    } catch (e) {
      console.error(e)
      setErrorText(t.checkoutError)
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
        {errorText && (
          <p className="text-sm mt-3 text-center" style={{ color: 'var(--color-primary)' }}>
            {errorText}
          </p>
        )}
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
