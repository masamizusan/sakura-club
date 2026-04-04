'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/auth/AuthGuard'

const pendingTranslations: Record<string, Record<string, string>> = {
  ja: {
    title: '審査中',
    message: '身分証を受け付けました。AIによる審査が完了次第（通常数分以内）、メッセージ機能が利用可能になります。',
    note: '審査に時間がかかる場合は、運営が手動で確認します。',
    backToHome: 'トップに戻る',
    backToMessages: 'メッセージ一覧へ',
  },
  en: {
    title: 'Under Review',
    message: 'Your ID has been submitted. Once the AI review is complete (usually within a few minutes), you will be able to use the messaging feature.',
    note: 'If the review takes longer, our team will manually verify your ID.',
    backToHome: 'Back to Top',
    backToMessages: 'Go to Messages',
  },
  ko: {
    title: '심사 중',
    message: '신분증이 접수되었습니다. AI 심사가 완료되면（보통 몇 분 이내）메시지 기능을 사용할 수 있습니다.',
    note: '심사에 시간이 걸리는 경우 운영팀이 직접 확인합니다.',
    backToHome: '홈으로 돌아가기',
    backToMessages: '메시지 목록으로',
  },
  'zh-tw': {
    title: '審查中',
    message: '您的證件已提交。AI審查完成後（通常數分鐘內），您將可以使用訊息功能。',
    note: '如果審查需要更長時間，我們的團隊將手動驗證您的證件。',
    backToHome: '返回首頁',
    backToMessages: '前往訊息列表',
  },
}

function PendingContent() {
  const { currentLanguage } = useLanguage()
  const t = (key: string): string => {
    const texts = pendingTranslations[currentLanguage] || pendingTranslations['ja']
    return texts[key] || pendingTranslations['ja'][key] || key
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64 flex items-center justify-center min-h-screen px-4">
        <div className="max-w-lg w-full text-center">
          <div className="text-7xl mb-6">⏳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-gray-600 mb-3 leading-relaxed">{t('message')}</p>
          <p className="text-sm text-gray-400 mb-8">{t('note')}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/messages"
              className="bg-sakura-500 text-white px-8 py-3 rounded-full font-medium hover:bg-sakura-600 transition-colors"
            >
              {t('backToMessages')}
            </Link>
            <Link
              href="/matches"
              className="border border-gray-300 text-gray-600 px-8 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PendingPage() {
  return <AuthGuard><PendingContent /></AuthGuard>
}
