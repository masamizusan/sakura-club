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
    message: 'このアカウントは退会処理されています。\n30日以内であれば運営へのご連絡で復旧可能です。\n以降はデータが完全に削除されます。',
    contactLink: 'お問い合わせ',
    backToHome: 'トップページへ戻る',
  },
  en: {
    title: 'Account Deleted',
    message: 'This account has been deleted.\nWithin 30 days, restoration is possible by contacting the operations team.\nAfter that, the data will be permanently deleted.',
    contactLink: 'Contact us',
    backToHome: 'Back to Home',
  },
  ko: {
    title: '탈퇴한 계정',
    message: '이 계정은 탈퇴 처리되었습니다.\n30일 이내라면 운영팀 연락으로 복구 가능합니다.\n이후에는 데이터가 완전히 삭제됩니다.',
    contactLink: '문의하기',
    backToHome: '홈으로 돌아가기',
  },
  'zh-tw': {
    title: '已退會帳號',
    message: '此帳號已完成退會程序。\n30天內可透過聯絡營運團隊恢復帳號。\n之後資料將被完全刪除。',
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
