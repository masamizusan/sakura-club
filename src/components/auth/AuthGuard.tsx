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
  
  // テストモードの即座な検出（拡張版：プロフィール編集 + マッチング画面 + ダッシュボード画面）
  const [isTestMode, setIsTestMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const isProfileEditPage = window.location.pathname.includes('/profile/edit')
      const isMatchesPage = window.location.pathname.includes('/matches')
      const isDashboardPage = window.location.pathname.includes('/dashboard')
      
      // 開発者フラグの確認
      const devTestFlag = urlParams.get('devTest') === 'true' || localStorage.getItem('devTestMode') === 'true'
      
      // マイページからの遷移の場合はテストモードではない
      if (urlParams.get('fromMyPage') === 'true') {
        console.log('🔍 INITIAL detection: fromMyPage=true, not test mode')
        return false
      }
      
      // マッチング画面またはダッシュボード画面でのテストモード判定
      if ((isMatchesPage || isDashboardPage) && devTestFlag) {
        console.log('🔍 INITIAL detection: matches/dashboard page with devTest flag')
        return true
      }
      
      // fromMyPageがある場合はtypeパラメータを除外してテストモード判定
      const isFromMyPage = urlParams.get('fromMyPage') === 'true'
      const typeParam = !isFromMyPage ? urlParams.get('type') : null
      const hasTestParams = typeParam || urlParams.get('gender') || urlParams.get('nickname') || urlParams.get('birth_date') || urlParams.get('age') || urlParams.get('nationality')
      
      const detected = (isProfileEditPage && !isFromMyPage && !!hasTestParams) || ((isMatchesPage || isDashboardPage) && devTestFlag)
      console.log('🔍 INITIAL test mode detection:', { isProfileEditPage, isMatchesPage, isDashboardPage, isFromMyPage, hasTestParams, devTestFlag, detected })
      return detected
    }
    return false
  })
  
  const hasRedirected = useRef(false)
  
  // テストモード時はルーターのpushメソッドを無効化
  const safeRouter = {
    ...router,
    push: (url: string) => {
      if (isTestMode) {
        console.log('🧪 Router push blocked in test mode:', url)
        return Promise.resolve(true)
      }
      return router.push(url)
    }
  }

  // テストモード検出（拡張版：プロフィール編集 + マッチング画面）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      
      // 開発者フラグの確認
      const devTestFlag = urlParams.get('devTest') === 'true' || localStorage.getItem('devTestMode') === 'true'
      
      // マイページからの遷移の場合はテストモードではない
      if (urlParams.get('fromMyPage') === 'true') {
        if (isTestMode) {
          console.log('🔍 fromMyPage=true detected - disabling test mode')
          setIsTestMode(false)
        }
        return
      }
      
      // 現在のページ種別判定
      const isProfileEditPage = window.location.pathname.includes('/profile/edit')
      const isMatchesPage = window.location.pathname.includes('/matches')
      const isDashboardPage = window.location.pathname.includes('/dashboard')
      
      // fromMyPageがある場合はtypeパラメータによるテストモード判定をスキップ
      const isFromMyPage = urlParams.get('fromMyPage') === 'true'
      const hasTestModeParams = !isFromMyPage && (urlParams.get('type') === 'foreign-male' || urlParams.get('type') === 'japanese-female')
      const hasGender = urlParams.get('gender')
      const hasNickname = urlParams.get('nickname')
      const hasBirthDate = urlParams.get('birth_date')
      const hasAge = urlParams.get('age')
      const hasNationality = urlParams.get('nationality')
      const hasPrefecture = urlParams.get('prefecture')
      
      // テストモードの条件
      const profileEditTestMode = isProfileEditPage && !isFromMyPage && (
        hasTestModeParams || 
        (hasGender && (hasNickname || hasBirthDate || hasAge || hasNationality || hasPrefecture))
      )
      const matchesTestMode = isMatchesPage && devTestFlag
      const dashboardTestMode = isDashboardPage && devTestFlag
      
      const testModeDetected = profileEditTestMode || matchesTestMode || dashboardTestMode
      
      console.log('🔍 AuthGuard test mode check:', {
        isProfileEditPage,
        isMatchesPage,
        isDashboardPage,
        isFromMyPage,
        fromMyPage: urlParams.get('fromMyPage'),
        devTestFlag,
        hasTestModeParams,
        hasGender,
        hasNickname,
        hasBirthDate,
        hasAge,
        hasNationality,
        hasPrefecture,
        profileEditTestMode,
        matchesTestMode,
        dashboardTestMode,
        testModeDetected,
        currentPath: window.location.pathname,
        searchParams: window.location.search
      })
      
      if (testModeDetected && !isTestMode) {
        console.log('🧪 Test mode detected in AuthGuard - updating state!')
        setIsTestMode(true)
      } else if (!testModeDetected && isTestMode) {
        console.log('❌ Test mode no longer detected - disabling')
        setIsTestMode(false)
      }
    }
  }, [isTestMode])

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
      console.log('🧪 Test mode active - skipping authentication completely')
      hasRedirected.current = false // リダイレクトフラグをリセット
      return
    }
    
    // マイページからの遷移の場合は認証チェックをスキップ
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('fromMyPage') === 'true') {
        console.log('🎯 fromMyPage=true - skipping authentication check')
        hasRedirected.current = false // リダイレクトフラグをリセット
        return
      }
    }
    
    // マイページでプレビューデータがある場合は特別処理
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
    
    // 認証が必要で、初期化済み、ユーザーなし、読み込み中でない、まだリダイレクトしていない場合のみリダイレクト
    // ただし、テストモードの場合は認証チェックをスキップ
    if (isInitialized && !user && !isLoading && !hasRedirected.current && !isTestMode) {
      hasRedirected.current = true
      console.log('Redirecting to login - no user found')
      safeRouter.push('/login')
    }
  }, [user, isLoading, isInitialized, isTestMode, safeRouter])

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

  // テストモードの場合は即座にコンポーネントを表示
  if (isTestMode) {
    console.log('🧪 Test mode - rendering children directly')
    return <>{children}</>
  }

  // マイページからの遷移の場合は即座にコンポーネントを表示
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('fromMyPage') === 'true') {
      console.log('🎯 fromMyPage=true - rendering children directly')
      return <>{children}</>
    }
  }

  // 通常モード：認証済みユーザーまたはマイページ+プレビューデータの場合のみ子コンポーネントを表示
  if (!user) {
    const isMyPage = typeof window !== 'undefined' && window.location.pathname.includes('/mypage')
    const hasPreviewData = typeof window !== 'undefined' && (
      localStorage.getItem('previewCompleteData') || 
      localStorage.getItem('updateProfile') ||
      sessionStorage.getItem('previewData') ||
      Object.keys(sessionStorage).some(key => key.startsWith('previewData_'))
    )
    
    if (isMyPage && hasPreviewData) {
      console.log('🎯 MyPage with preview data - rendering without full authentication')
      return <>{children}</>
    }
    
    console.log('❌ No user and not test mode - will redirect')
    return null // Will redirect to login
  }

  return <>{children}</>
}