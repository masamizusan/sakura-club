'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

// エラー画面の文言（4 言語）
type Dict = {
  title: string
  message: string
  details: string
  errorId: string
  retry: string
  home: string
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    title: '🚨 エラーが発生しました',
    message: '申し訳ありません。予期しないエラーが発生しました。',
    details: 'エラー詳細:',
    errorId: 'エラーID:',
    retry: '再試行',
    home: 'ホームに戻る',
  },
  en: {
    title: '🚨 Something went wrong',
    message: 'Sorry, an unexpected error occurred.',
    details: 'Error details:',
    errorId: 'Error ID:',
    retry: 'Try again',
    home: 'Back to home',
  },
  ko: {
    title: '🚨 오류가 발생했습니다',
    message: '죄송합니다. 예기치 않은 오류가 발생했습니다.',
    details: '오류 상세:',
    errorId: '오류 ID:',
    retry: '다시 시도',
    home: '홈으로 돌아가기',
  },
  'zh-tw': {
    title: '🚨 發生錯誤',
    message: '很抱歉，發生了未預期的錯誤。',
    details: '錯誤詳情：',
    errorId: '錯誤 ID：',
    retry: '重試',
    home: '返回首頁',
  },
}

// 表示言語の取得。言語の仕組み自体が壊れている（Provider の外・例外）場合でも画面が出るよう、
// 失敗したら日本語にする（フックは毎回同じ順で 1 回だけ呼ぶ）
function useErrorPageLanguage(): SupportedLanguage {
  try {
    return useLanguage().currentLanguage
  } catch {
    return 'ja'
  }
}

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  const language = useErrorPageLanguage()
  const t = T[language] ?? T.ja

  useEffect(() => {
    // 🚨 error boundary発火時の確実なログ出力
    console.error('🚨 ERROR BOUNDARY TRIGGERED:', {
      timestamp: new Date().toISOString(),
      message: error.message,
      name: error.name,
      stack: error.stack,
      digest: error.digest,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      localStorage_devTestMode: typeof window !== 'undefined' ? localStorage.getItem('devTestMode') : null,
      sessionStorage_keys: typeof window !== 'undefined' ? Object.keys(sessionStorage) : [],
      // 🔍 追加デバッグ情報
      urlParams: typeof window !== 'undefined' ? Object.fromEntries(new URLSearchParams(window.location.search)) : {},
      isTestMode: typeof window !== 'undefined' ? (
        new URLSearchParams(window.location.search).get('devTest') === 'true' ||
        window.location.pathname.includes('/test') ||
        localStorage.getItem('devTestMode') === 'true'
      ) : false
    })
    
    // 🚨 NEXT_ERROR_BOUNDARY でも出力（デバッグ用）
    console.error('NEXT_ERROR_BOUNDARY', error)
    
    // 🔥 ERROR BOUNDARY: 完全スタックトレース出力
    console.error('🔥 ERROR BOUNDARY:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
  }, [error])

  return (
    <div className="min-h-screen bg-[#f5ebe0]">
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-4">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            {t.title}
          </h2>
          <p className="text-gray-700 mb-4">
            {t.message}
          </p>
          <div className="text-sm text-gray-500 mb-6">
            <p>{t.details}</p>
            <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs mt-1">
                {t.errorId} {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={reset}
              className="flex-1"
            >
              {t.retry}
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1"
            >
              {t.home}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}