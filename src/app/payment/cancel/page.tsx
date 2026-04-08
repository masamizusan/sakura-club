'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

const translations = {
  ja: { title: 'キャンセルしました', message: 'いつでもプランに登録できます。', button: '戻る' },
  en: { title: 'Payment Cancelled', message: 'You can subscribe anytime.', button: 'Go Back' },
  ko: { title: '취소되었습니다', message: '언제든지 구독할 수 있습니다.', button: '돌아가기' },
  'zh-tw': { title: '已取消', message: '您可以隨時訂閱。', button: '返回' },
}

export default function PaymentCancelPage() {
  const router = useRouter()
  const { currentLanguage } = useLanguage()
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
