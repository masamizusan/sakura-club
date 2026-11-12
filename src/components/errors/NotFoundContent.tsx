'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

// 404 画面の文言（4 言語）
type Dict = {
  title: string
  message: string
  home: string
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    title: 'ページが見つかりません',
    message: 'お探しのページは、移動または削除された可能性があります。',
    home: 'トップへ戻る',
  },
  en: {
    title: 'Page not found',
    message: 'The page you are looking for may have been moved or deleted.',
    home: 'Back to home',
  },
  ko: {
    title: '페이지를 찾을 수 없습니다',
    message: '찾으시는 페이지가 이동되었거나 삭제되었을 수 있습니다.',
    home: '홈으로 돌아가기',
  },
  'zh-tw': {
    title: '找不到頁面',
    message: '您要找的頁面可能已被移動或刪除。',
    home: '返回首頁',
  },
}

// 画面の言語の取得。言語の仕組みが使えない（Provider の外・例外）ときは日本語にする（error.tsx と同じ）
function useNotFoundLanguage(): SupportedLanguage {
  try {
    return useLanguage().currentLanguage
  } catch {
    return 'ja'
  }
}

export default function NotFoundContent() {
  const language = useNotFoundLanguage()
  const t = T[language] ?? T.ja

  // タブの題名を画面の言語に合わせる（初期値は not-found.tsx の metadata の日本語）
  useEffect(() => {
    document.title = `${t.title} | SAKURA CLUB`
  }, [t.title])

  return (
    <div
      data-not-found-page
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* 404 画面ではスマホの下のメニュー（ルートの layout の BottomNav）を隠す */}
      <style>{`body:has([data-not-found-page]) nav[aria-label="モバイルナビゲーション"] { display: none; }`}</style>
      <div className="max-w-md w-full text-center">
        <Link
          href="/"
          className="font-cormorant text-2xl inline-block mb-10"
          style={{ color: 'var(--color-primary)', letterSpacing: '0.2em', fontWeight: 300 }}
        >
          SAKURA CLUB
        </Link>
        <div className="app-card px-6 py-8 sm:p-8">
          <p
            className="font-cormorant text-5xl mb-4"
            style={{ color: 'var(--color-primary)', letterSpacing: '0.15em', fontWeight: 300 }}
            aria-hidden="true"
          >
            404
          </p>
          <h1
            className="font-shippori text-xl sm:text-2xl mb-4"
            style={{ color: 'var(--color-text)', letterSpacing: '0.05em' }}
          >
            {t.title}
          </h1>
          <p
            className="mb-8"
            style={{ color: 'var(--color-text-sub)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.8 }}
          >
            {t.message}
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center justify-center w-full h-11 px-6 text-sm"
          >
            {t.home}
          </Link>
        </div>
      </div>
    </div>
  )
}
