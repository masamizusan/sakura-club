'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

export default function VerificationIntroPage() {
  const { currentLanguage } = useLanguage()

  const translations: Record<string, {
    title: string
    subtitle: string
    idOnly: string
    idOnlyDesc: string
    benefits: string[]
    startButton: string
    back: string
  }> = {
    ja: {
      title: '本人年齢確認',
      subtitle: '安心安全にご利用いただくために、\n本人の年齢確認をお願いしています。',
      idOnly: '身分証で年齢確認',
      idOnlyDesc: '生年月日が記載された身分証をご用意ください',
      benefits: [
        '審査が完了するとメッセージ機能が利用できます',
        'AIによる安心・安全な審査システムです',
        '身分証は年齢確認のみに使用され、第三者に共有されることはありません',
      ],
      startButton: '年齢確認を始める',
      back: '戻る',
    },
    en: {
      title: 'Age Verification',
      subtitle: 'To ensure a safe experience,\nwe require age verification.',
      idOnly: 'Age Verification via ID',
      idOnlyDesc: 'Please prepare an ID that shows your date of birth',
      benefits: [
        'You can use messaging once verification is complete',
        'Safe and secure AI-powered verification system',
        'Your ID is used only for age verification and never shared with third parties',
      ],
      startButton: 'Start Age Verification',
      back: 'Back',
    },
    ko: {
      title: '본인 나이 확인',
      subtitle: '안전한 이용을 위해\n나이 확인을 부탁드립니다.',
      idOnly: '신분증으로 나이 확인',
      idOnlyDesc: '생년월일이 기재된 신분증을 준비해 주세요',
      benefits: [
        '심사가 완료되면 메시지 기능을 이용할 수 있습니다',
        'AI 기반의 안전한 심사 시스템입니다',
        '신분증은 나이 확인에만 사용되며 제3자에게 공유되지 않습니다',
      ],
      startButton: '나이 확인 시작하기',
      back: '돌아가기',
    },
    'zh-tw': {
      title: '本人年齡確認',
      subtitle: '為了確保安全使用，\n請進行年齡確認。',
      idOnly: '以身份證確認年齡',
      idOnlyDesc: '請準備標有出生日期的身份證件',
      benefits: [
        '驗證完成後即可使用訊息功能',
        '安全可靠的AI審查系統',
        '身份證僅用於年齡驗證，不會與第三方共享',
      ],
      startButton: '開始年齡確認',
      back: '返回',
    },
  }

  const t = translations[currentLanguage] || translations['ja']

  return (
    <div className="max-w-lg mx-auto p-6">
      {/* 戻るリンク */}
      <Link href="/mypage" className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-700">
        ← {t.back}
      </Link>

      <h1 className="text-2xl font-bold text-center mb-2">{t.title}</h1>
      <p className="text-center text-gray-500 mb-8 whitespace-pre-line">{t.subtitle}</p>

      {/* メインカード */}
      <div className="bg-pink-50 border border-pink-100 rounded-2xl p-6 mb-6 text-center">
        <div className="text-5xl mb-3">🪪</div>
        <p className="text-lg font-bold text-pink-600">{t.idOnly}</p>
        <p className="text-sm text-gray-500 mt-1">{t.idOnlyDesc}</p>
      </div>

      {/* メリットリスト */}
      <div className="space-y-4 mb-8">
        {t.benefits.map((benefit, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-pink-500 text-xl mt-0.5">✅</span>
            <p className="text-gray-700">{benefit}</p>
          </div>
        ))}
      </div>

      {/* 登録ボタン */}
      <Link
        href="/verification/upload"
        className="block w-full bg-pink-500 text-white text-center py-4 rounded-full font-bold text-lg hover:bg-pink-600 transition-colors"
      >
        {t.startButton}
      </Link>
    </div>
  )
}
