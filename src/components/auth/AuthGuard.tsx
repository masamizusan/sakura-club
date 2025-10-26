'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuth()
  const router = useRouter()
  const [timeoutReached, setTimeoutReached] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const hasRedirected = useRef(false)

  // テストモード検出
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const hasTestModeParams = urlParams.get('type') === 'foreign-male' || urlParams.get('type') === 'japanese-female'
      const hasGender = urlParams.get('gender')
      const hasNickname = urlParams.get('nickname')
      
      // テストモードの条件：プロフィール編集画面で必要なパラメータが存在する
      const testModeDetected = hasTestModeParams && (hasGender || hasNickname)
      
      if (testModeDetected) {
        console.log('🧪 Test mode detected in AuthGuard:', { hasTestModeParams, hasGender, hasNickname })
        setIsTestMode(true)
      }
    }
  }, [])

  useEffect(() => {
    console.log('AuthGuard state:', { 
      user: !!user, 
      isLoading, 
      isInitialized, 
      isTestMode,
      hasRedirected: hasRedirected.current 
    })
    
    // テストモードの場合は認証チェックをスキップ
    if (isTestMode) {
      console.log('🧪 Test mode active - skipping authentication')
      return
    }
    
    if (isInitialized && !user && !isLoading && !hasRedirected.current) {
      hasRedirected.current = true
      console.log('Redirecting to login - no user found')
      router.push('/login')
    }
  }, [user, isLoading, isInitialized, isTestMode, router])

  // タイムアウト処理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialized) {
        console.warn('Auth initialization timeout reached')
        setTimeoutReached(true)
      }
    }, 10000) // 10秒でタイムアウト

    return () => clearTimeout(timer)
  }, [isInitialized])

  if (timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">接続に時間がかかっています</h2>
          <p className="text-gray-600 mb-4">
            認証の初期化に時間がかかっています。再読み込みしてください。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-sakura-600 text-white rounded hover:bg-sakura-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !isInitialized) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
            <p className="text-gray-600">読み込み中...</p>
            <p className="text-xs text-gray-400 mt-2">
              初期化中... ({isInitialized ? '完了' : '処理中'})
            </p>
          </div>
        </div>
      )
    )
  }

  // テストモードまたは認証済みユーザーの場合のみ子コンポーネントを表示
  if (!user && !isTestMode) {
    return null // Will redirect to login
  }

  return <>{children}</>
}