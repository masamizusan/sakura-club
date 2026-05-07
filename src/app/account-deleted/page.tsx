'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

const T: Record<SupportedLanguage, {
  title: string
  message: string
  contactLink: string
  backToHome: string
}> = {
  ja: {
    title: '退会済みアカウント',
    message: 'このアカウントは退会処理されています。\nすべてのデータは削除されました。\n\n再度ご利用をご希望の場合は、新規登録ページよりお手続きください。',
    contactLink: 'お問い合わせ',
    backToHome: 'トップページへ戻る',
  },
  en: {
    title: 'Account Deleted',
    message: 'This account has been deleted.\nAll data has been removed.\n\nIf you wish to use the service again, please proceed from the sign-up page.',
    contactLink: 'Contact us',
    backToHome: 'Back to Home',
  },
  ko: {
    title: '탈퇴한 계정',
    message: '이 계정은 탈퇴 처리되었습니다.\n모든 데이터가 삭제되었습니다.\n\n다시 이용하시려면 신규 가입 페이지에서 진행해 주세요.',
    contactLink: '문의하기',
    backToHome: '홈으로 돌아가기',
  },
  'zh-tw': {
    title: '已退會帳號',
    message: '此帳號已完成退會處理。\n所有資料皆已刪除。\n\n如欲再次使用服務，請從新會員註冊頁面進行操作。',
    contactLink: '聯絡我們',
    backToHome: '返回首頁',
  },
}

export default function AccountDeletedPage() {
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja
  const supabase = createClient()

  // この画面に来たユーザーは退会済み or 退会処理中。セッションが残っていれば破棄。
  useEffect(() => {
    supabase.auth.signOut().catch(() => {})
  }, [supabase])

  return (
    <div style={{ minHeight: '100vh', background: '#f5ebe0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '2.5rem 1.5rem', textAlign: 'center', border: '1px solid #d4a89a', maxWidth: '420px', width: '100%' }}>
        <p style={{ fontSize: '40px', marginBottom: '1rem' }}>🌙</p>
        <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '20px', marginBottom: '1rem' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: '13px', color: '#6b4c3b', lineHeight: 1.9, marginBottom: '1.75rem', whiteSpace: 'pre-line' }}>
          {t.message}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link
            href="/mypage/contact"
            style={{ display: 'inline-block', background: '#8b1a2e', color: '#fff', borderRadius: '9999px', padding: '12px 32px', textDecoration: 'none', fontFamily: 'Shippori Mincho B1, serif', fontSize: '14px', letterSpacing: '0.08em' }}
          >
            {t.contactLink}
          </Link>
          <Link
            href="/"
            style={{ display: 'inline-block', background: 'transparent', color: '#8b1a2e', border: '1px solid #8b1a2e', borderRadius: '9999px', padding: '12px 32px', textDecoration: 'none', fontFamily: 'Shippori Mincho B1, serif', fontSize: '14px', letterSpacing: '0.08em' }}
          >
            {t.backToHome}
          </Link>
        </div>
      </div>
    </div>
  )
}
