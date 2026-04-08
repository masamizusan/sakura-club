'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

const translations = {
  ja: {
    title: '登録完了！',
    message: 'プレミアムプランへようこそ 🌸\nメッセージを楽しんでください！',
    button: 'メッセージへ',
  },
  en: {
    title: "You're in! 🌸",
    message: 'Welcome to SAKURA CLUB Premium!\nStart messaging now.',
    button: 'Go to Messages',
  },
  ko: {
    title: '가입 완료! 🌸',
    message: '프리미엄 플랜에 오신 것을 환영합니다!\n지금 메시지를 보내보세요.',
    button: '메시지로 이동',
  },
  'zh-tw': {
    title: '訂閱成功！🌸',
    message: '歡迎加入高級方案！\n現在開始傳送訊息吧。',
    button: '前往訊息',
  },
}

export default function PaymentSuccessPage() {
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const t = translations[currentLanguage as keyof typeof translations] || translations.en

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🌸</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{t.title}</h1>
        <p className="text-gray-600 mb-8 whitespace-pre-line">{t.message}</p>
        <button
          onClick={() => router.push('/matches')}
          className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90"
        >
          {t.button}
        </button>
      </div>
    </div>
  )
}
