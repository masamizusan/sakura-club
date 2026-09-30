'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

const translations = {
  ja: { title: 'キャンセルしました', message: 'いつでもプランに登録できます。', button: '戻る' },
  en: { title: 'Payment Cancelled', message: 'You can subscribe anytime.', button: 'Go Back' },
  ko: { title: '취소되었습니다', message: '언제든지 구독할 수 있습니다.', button: '돌아가기' },
  'zh-tw': { title: '已取消', message: '您可以隨時訂閱。', button: '返回' },
}

// 段階3-2: さくらいいね回数券の購入キャンセル（?kind=sakura）
const sakuraTranslations = {
  ja: { title: '購入はキャンセルされました', button: 'さくらいいねに戻る' },
  en: { title: 'Your purchase was cancelled', button: 'Back to Sakura Likes' },
  ko: { title: '구매가 취소되었습니다', button: '사쿠라 좋아요로 돌아가기' },
  'zh-tw': { title: '已取消購買', button: '返回櫻花讚' },
}

function PaymentCancelContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentLanguage } = useLanguage()

  if (searchParams?.get('kind') === 'sakura') {
    const s = sakuraTranslations[currentLanguage as keyof typeof sakuraTranslations] || sakuraTranslations.en
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-6">🌸</div>
          <h1 className="text-xl font-bold text-gray-900 mb-8">{s.title}</h1>
          <button
            onClick={() => router.push('/mypage/plans#sakura')}
            className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-300"
          >
            {s.button}
          </button>
        </div>
      </div>
    )
  }

  const t = translations[currentLanguage as keyof typeof translations] || translations.en

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-6">😔</div>
        <h1 className="text-xl font-bold text-gray-900 mb-3">{t.title}</h1>
        <p className="text-gray-500 mb-8">{t.message}</p>
        <button
          onClick={() => router.back()}
          className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-300"
        >
          {t.button}
        </button>
      </div>
    </div>
  )
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCancelContent />
    </Suspense>
  )
}
