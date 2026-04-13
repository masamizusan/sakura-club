'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
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
            🚨 エラーが発生しました
          </h2>
          <p className="text-gray-700 mb-4">
            申し訳ありません。予期しないエラーが発生しました。
          </p>
          <div className="text-sm text-gray-500 mb-6">
            <p>エラー詳細:</p>
            <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs mt-1">
                エラーID: {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={reset}
              className="flex-1"
            >
              再試行
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1"
            >
              ホームに戻る
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}