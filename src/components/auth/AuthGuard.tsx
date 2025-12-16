'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

// 🔧 CRITICAL: テストモード同期判定関数 - 状態競合回避
function isTestModeNow(): boolean {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  const pathname = window.location.pathname
  
  // 1) dev=skip-verification パラメータ
  if (urlParams.get('dev') === 'skip-verification') return true
  
  // 2) devTest フラグ  
  if (urlParams.get('devTest') === 'true' || localStorage.getItem('devTestMode') === 'true') return true
  
  // 3) /test ページ
  if (pathname.includes('/test')) return true
  
  // 4) profile/edit with signup params
  if (pathname.includes('/profile/edit')) {
    const hasSignupParams = !!(urlParams.get('type') || urlParams.get('gender') || urlParams.get('nickname'))
    const isFromMyPage = urlParams.get('fromMyPage') === 'true'
    return hasSignupParams && !isFromMyPage
  }
  
  // 5) matches/dashboard with devTest
  if ((pathname.includes('/matches') || pathname.includes('/dashboard')) && urlParams.get('devTest') === 'true') {
    return true
  }
  
  return false
}

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading, authReady } = useAuth()
  const router = useRouter()
  const [timeoutReached, setTimeoutReached] = useState(false)
  const hasRedirected = useRef(false)
  
  // 🔧 CRITICAL: テストモード即座判定 - 同期的・状態競合なし
  const isCurrentlyTestMode = isTestModeNow()
  
  // 🔧 CRITICAL: テストモード時のルーター無効化
  const safeRouter = {
    ...router,
    push: (url: string) => {
      if (isCurrentlyTestMode) {
        console.log('🧪 Router push blocked in test mode:', url)
        return Promise.resolve(true)
      }
      return router.push(url)
    }
  }

  // 🔧 CRITICAL: AuthGuard判定ロジック - redirect競合根治
  useEffect(() => {
    console.log('🔍 AuthGuard state:', { 
      user: !!user, 
      isLoading,
      authReady,
      isCurrentlyTestMode,
      hasRedirected: hasRedirected.current 
    })
    
    // 🔧 STEP 0: テストモードなら即座にchildren表示（redirectしない）
    if (isCurrentlyTestMode) {
      console.log('🧪 Test mode active - skipping authentication completely')
      hasRedirected.current = false // リダイレクトフラグをリセット
      return
    }
    
    // 🔧 STEP 1: authReadyになるまで待つ（ここでredirect禁止）
    if (!authReady) {
      console.log('⏳ Waiting for auth ready - no redirect yet')
      return
    }
    
    // 🔧 STEP 2: 特別ケース - マイページのプレビューデータ
    const isMyPage = typeof window !== 'undefined' && window.location.pathname.includes('/mypage')
    const hasPreviewData = typeof window !== 'undefined' && (
      localStorage.getItem('previewCompleteData') || 
      localStorage.getItem('updateProfile') ||
      sessionStorage.getItem('previewData') ||
      Object.keys(sessionStorage).some(key => key.startsWith('previewData_'))
    )
    
    if (isMyPage && hasPreviewData && !user) {
      console.log('🎯 MyPage with preview data - allowing access without full authentication')
      return
    }
    
    // 🔧 STEP 3: fromMyPage遷移は認証チェックスキップ
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('fromMyPage') === 'true') {
        console.log('🎯 fromMyPage=true - skipping authentication check')
        hasRedirected.current = false // リダイレクトフラグをリセット
        return
      }
    }
    
    // 🔧 STEP 4: authReady後にuser無ければloginへ
    if (!user && !hasRedirected.current) {
      hasRedirected.current = true
      console.log('❌ No user and not test mode - redirecting to login')
      safeRouter.push('/login')
    }
  }, [user, authReady, isCurrentlyTestMode, safeRouter])

  // タイムアウト処理 - authReady基準
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authReady) {
        console.warn('Auth ready timeout reached')
        setTimeoutReached(true)
      }
    }, 10000) // 10秒でタイムアウト

    return () => clearTimeout(timer)
  }, [authReady])

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

  // 🔧 CRITICAL: ローディング判定 - authReady基準  
  if (isLoading || !authReady) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
            <p className="text-gray-600">読み込み中...</p>
            <p className="text-xs text-gray-400 mt-2">
              認証初期化中... ({authReady ? '完了' : '処理中'})
            </p>
          </div>
        </div>
      )
    )
  }

  // 🔧 STEP 0: テストモードなら即座に表示
  if (isCurrentlyTestMode) {
    console.log('🧪 Test mode - rendering children directly')
    return <>{children}</>
  }

  // 🔧 STEP 1: fromMyPage遷移なら即座に表示
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('fromMyPage') === 'true') {
      console.log('🎯 fromMyPage=true - rendering children directly')
      return <>{children}</>
    }
  }

  // 🔧 STEP 2: マイページ+プレビューデータなら表示
  const isMyPage = typeof window !== 'undefined' && window.location.pathname.includes('/mypage')
  const hasPreviewData = typeof window !== 'undefined' && (
    localStorage.getItem('previewCompleteData') || 
    localStorage.getItem('updateProfile') ||
    sessionStorage.getItem('previewData') ||
    Object.keys(sessionStorage).some(key => key.startsWith('previewData_'))
  )
  
  if (isMyPage && hasPreviewData && !user) {
    console.log('🎯 MyPage with preview data - rendering without full authentication')
    return <>{children}</>
  }

  // 🔧 STEP 3: ユーザー認証済みなら表示
  if (user) {
    console.log('✅ Authenticated user - rendering children')
    return <>{children}</>
  }

  // 🔧 STEP 4: 認証なし・テストモードでもないなら待機（redirectは useEffect で処理）
  console.log('⏳ No authentication - waiting for redirect...')
  return null
}