'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

// 段階3-2: さくらいいね回数券の購入完了（?kind=sakura）
const sakuraTranslations = {
  ja: {
    title: 'さくらいいねを購入しました',
    message: '反映まで数秒かかる場合があります。',
    button: 'お相手をさがす',
    subButton: '残り枚数を確認',
  },
  en: {
    title: 'Sakura Likes purchased 🌸',
    message: 'It may take a few seconds for them to appear.',
    button: 'Find matches',
    subButton: 'Check remaining Sakura Likes',
  },
  ko: {
    title: '사쿠라 좋아요를 구매했습니다 🌸',
    message: '반영까지 몇 초 정도 걸릴 수 있습니다.',
    button: '상대 찾기',
    subButton: '남은 개수 확인',
  },
  'zh-tw': {
    title: '已購買櫻花讚 🌸',
    message: '可能需要幾秒鐘才會反映。',
    button: '尋找對象',
    subButton: '查看剩餘數量',
  },
}

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentLanguage } = useLanguage()

  if (searchParams?.get('kind') === 'sakura') {
    const s = sakuraTranslations[currentLanguage as keyof typeof sakuraTranslations] || sakuraTranslations.en
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">🌸</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{s.title}</h1>
          <p className="text-gray-600 mb-8 whitespace-pre-line">{s.message}</p>
          <button
            onClick={() => router.push('/matches')}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90"
          >
            {s.button}
          </button>
          <div className="mt-4">
            <button
              onClick={() => router.push('/mypage/plans#sakura')}
              className="text-sm text-gray-600 underline hover:opacity-80"
            >
              {s.subButton}
            </button>
          </div>
        </div>
      </div>
    )
  }

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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
