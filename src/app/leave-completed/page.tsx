'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

const T: Record<SupportedLanguage, { title: string; message: string; backToHome: string }> = {
  ja: {
    title: '退会手続きが完了しました',
    message: 'ご利用いただきありがとうございました。\n\n再度ご利用をご希望の場合は、新規登録ページよりお手続きください。',
    backToHome: 'トップページへ戻る',
  },
  en: {
    title: 'Account Deletion Completed',
    message: 'Thank you for using SAKURA CLUB.\n\nIf you wish to use the service again, please proceed from the sign-up page.',
    backToHome: 'Back to Home',
  },
  ko: {
    title: '탈퇴 절차가 완료되었습니다',
    message: '이용해 주셔서 감사합니다.\n\n다시 이용하시려면 신규 가입 페이지에서 진행해 주세요.',
    backToHome: '홈으로 돌아가기',
  },
  'zh-tw': {
    title: '退會手續已完成',
    message: '感謝您的使用。\n\n如欲再次使用服務，請從新會員註冊頁面進行操作。',
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
