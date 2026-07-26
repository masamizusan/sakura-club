'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'
import Link from 'next/link'

type Dict = {
  title: string
  comingSoon: string
  back: string
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    title: '特定商取引法に基づく表記',
    comingSoon: 'このページは準備中です。',
    back: '← トップへ戻る',
  },
  en: {
    title: 'Legal Notice',
    comingSoon: 'This page is coming soon.',
    back: '← Back to Top',
  },
  ko: {
    title: '법적 고지',
    comingSoon: '준비 중입니다.',
    back: '← 홈으로 돌아가기',
  },
  'zh-tw': {
    title: '法定聲明',
    comingSoon: '頁面準備中。',
    back: '← 返回首頁',
  },
}

export default function TokushohoPage() {
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24"
      style={{ backgroundColor: 'var(--color-washi)' }}>
      <div className="max-w-2xl w-full text-center">
        <h1 className="font-cormorant italic mb-8"
          style={{ fontSize: '2rem', color: 'var(--color-sumi)', fontWeight: 300, letterSpacing: '0.08em' }}>
          {t.title}
        </h1>
        <p className="font-shippori mb-12"
          style={{ color: 'var(--color-usuzumi)', fontSize: '1rem', lineHeight: 2 }}>
          {t.comingSoon}
        </p>
        <Link href="/" className="font-zen-kaku text-sm transition-opacity hover:opacity-60"
          style={{ color: 'var(--color-beni)', letterSpacing: '0.08em' }}>
          {t.back}
        </Link>
      </div>
    </main>
  )
}
