'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  isVerified: boolean
  isSubscribed: boolean
  onSelectPlan: () => void
}

const translations = {
  ja: {
    title: 'メッセージを送るために',
    subtitle: '以下の2つが必要です',
    step1Title: '本人年齢確認',
    step1Desc: '身分証による年齢確認',
    step2Title: 'プレミアムプラン',
    step2Desc: 'メッセージ機能の利用',
    completed: '完了',
    pending: '未完了',
    goVerify: '身分確認へ',
    goPlan: 'プランを選ぶ',
    close: '閉じる',
  },
  en: {
    title: 'To Send Messages',
    subtitle: 'Two steps required',
    step1Title: 'Age Verification',
    step1Desc: 'Verify your identity & age',
    step2Title: 'Premium Plan',
    step2Desc: 'Unlock messaging feature',
    completed: 'Done',
    pending: 'Required',
    goVerify: 'Get Verified',
    goPlan: 'Choose a Plan',
    close: 'Close',
  },
  ko: {
    title: '메시지를 보내려면',
    subtitle: '두 가지가 필요합니다',
    step1Title: '본인 연령 확인',
    step1Desc: '신분증으로 연령 확인',
    step2Title: '프리미엄 플랜',
    step2Desc: '메시지 기능 이용',
    completed: '완료',
    pending: '미완료',
    goVerify: '인증하러 가기',
    goPlan: '플랜 선택',
    close: '닫기',
  },
  'zh-tw': {
    title: '傳送訊息需要',
    subtitle: '完成以下兩個步驟',
    step1Title: '年齡身份驗證',
    step1Desc: '以證件確認年齡',
    step2Title: '高級方案',
    step2Desc: '解鎖訊息功能',
    completed: '完成',
    pending: '待完成',
    goVerify: '前往驗證',
    goPlan: '選擇方案',
    close: '關閉',
  },
}

export default function RequirementsModal({ isOpen, onClose, isVerified, isSubscribed, onSelectPlan }: Props) {
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const t = translations[currentLanguage as keyof typeof translations] || translations.en

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        {/* ステップカード */}
        <div className="space-y-3 mb-6">
          {/* STEP 1: 身分確認 */}
          <div className={`p-4 rounded-xl border-2 ${isVerified ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">STEP 1</span>
                <span className="text-lg">🪪</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
              }`}>
                {isVerified ? `✅ ${t.completed}` : `⏳ ${t.pending}`}
              </span>
            </div>
            <p className="font-semibold text-gray-900 text-sm">{t.step1Title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.step1Desc}</p>
            {!isVerified && (
              <button
                onClick={() => { onClose(); router.push('/verification') }}
                className="mt-3 w-full bg-gray-800 text-white text-sm py-2 rounded-lg font-medium hover:bg-gray-700 transition"
              >
                {t.goVerify}
              </button>
            )}
          </div>

          {/* STEP 2: プレミアムプラン */}
          <div className={`p-4 rounded-xl border-2 ${isSubscribed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">STEP 2</span>
                <span className="text-lg">💳</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isSubscribed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
              }`}>
                {isSubscribed ? `✅ ${t.completed}` : `⏳ ${t.pending}`}
              </span>
            </div>
            <p className="font-semibold text-gray-900 text-sm">{t.step2Title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.step2Desc}</p>
            {!isSubscribed && (
              <button
                onClick={onSelectPlan}
                className="mt-3 w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm py-2 rounded-lg font-medium hover:opacity-90 transition"
              >
                {t.goPlan}
              </button>
            )}
          </div>
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
        >
          {t.close}
        </button>
      </div>
    </div>
  )
}
