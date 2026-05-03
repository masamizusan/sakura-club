'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

const T: Record<SupportedLanguage, { title: string; message: string; backToHome: string }> = {
  ja: {
    title: '退会が完了しました',
    message: 'ご利用ありがとうございました。\nいただいたご意見はサービス改善に活用させていただきます。',
    backToHome: 'トップページへ戻る',
  },
  en: {
    title: 'Account Deletion Completed',
    message: 'Thank you for using SAKURA CLUB.\nYour feedback will help us improve our service.',
    backToHome: 'Back to Home',
  },
  ko: {
    title: '탈퇴가 완료되었습니다',
    message: '이용해 주셔서 감사합니다.\n주신 의견은 서비스 개선에 활용하겠습니다.',
    backToHome: '홈으로 돌아가기',
  },
  'zh-tw': {
    title: '退會已完成',
    message: '感謝您的使用。\n您提供的意見將用於改善服務。',
    backToHome: '返回首頁',
  },
}

export default function LeaveCompletedPage() {
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja

  return (
    <div style={{ minHeight: '100vh', background: '#f5ebe0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '2.5rem 1.5rem', textAlign: 'center', border: '1px solid #d4a89a', maxWidth: '420px', width: '100%' }}>
        <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🌸</p>
        <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '20px', marginBottom: '1rem' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: '14px', color: '#6b4c3b', lineHeight: 1.8, marginBottom: '2rem', whiteSpace: 'pre-line' }}>
          {t.message}
        </p>
        <Link
          href="/"
          style={{ display: 'inline-block', background: '#8b1a2e', color: '#fff', borderRadius: '9999px', padding: '12px 32px', textDecoration: 'none', fontFamily: 'Shippori Mincho B1, serif', fontSize: '14px', letterSpacing: '0.08em' }}
        >
          {t.backToHome}
        </Link>
      </div>
    </div>
  )
}
