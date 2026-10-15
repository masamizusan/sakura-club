'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/authStore'
import { Loader2 } from 'lucide-react'
import { logger } from '@/utils/logger'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'
import { COMMON_T } from '@/lib/i18n/common'

// 認証待ち・タイムアウト画面の文言（4 言語）
type Dict = {
  timeoutTitle: string
  timeoutMessage: string
  reload: string
  initializing: string
  done: string
  processing: string
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    timeoutTitle: '接続に時間がかかっています',
    timeoutMessage: '認証の初期化に時間がかかっています。再読み込みしてください。',
    reload: '再読み込み',
    initializing: '認証初期化中...',
    done: '完了',
    processing: '処理中',
  },
  en: {
    timeoutTitle: 'The connection is taking a while',
    timeoutMessage: 'Signing you in is taking longer than expected. Please reload the page.',
    reload: 'Reload',
    initializing: 'Preparing sign-in...',
    done: 'done',
    processing: 'in progress',
  },
  ko: {
    timeoutTitle: '연결에 시간이 걸리고 있습니다',
    timeoutMessage: '로그인 준비에 시간이 걸리고 있습니다. 페이지를 새로고침해 주세요.',
    reload: '새로고침',
    initializing: '로그인 준비 중...',
    done: '완료',
    processing: '처리 중',
  },
  'zh-tw': {
    timeoutTitle: '連線時間較長',
    timeoutMessage: '登入準備花費的時間較長，請重新載入頁面。',
    reload: '重新載入',
    initializing: '正在準備登入...',
    done: '完成',
    processing: '處理中',
  },
}

// 🔧 CRITICAL: テストモード同期判定関数 - 状態競合回避
function isTestModeNow(): boolean {
  if (typeof window === 'undefined') return false

  // 🛡️ 本番環境では強制的にfalse（Test mode混入防止）
  if (process.env.NODE_ENV === 'production') return false

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
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja
  const commonT = COMMON_T[currentLanguage] ?? COMMON_T.ja
  const [timeoutReached, setTimeoutReached] = useState(false)
  const hasRedirected = useRef(false)
  
  // 🔧 CRITICAL: テストモード即座判定 - 同期的・状態競合なし
  const isCurrentlyTestMode = isTestModeNow()
  
  // 🔧 CRITICAL: テストモード時のルーター無効化
  const safeRouter = {
    ...router,
    push: (url: string) => {
      if (isCurrentlyTestMode) {
        logger.debug('[AUTH_GUARD] router blocked (test mode)')
        return Promise.resolve(true)
      }
      return router.push(url)
    }
  }

  // 🔧 CRITICAL: AuthGuard判定ロジック - redirect競合根治
  useEffect(() => {
    // 🔧 STEP 0: テストモードなら即座にchildren表示（redirectしない）
    if (isCurrentlyTestMode) {
      hasRedirected.current = false
      return
    }

    // 🔧 STEP 1: authReadyになるまで待つ（ここでredirect禁止）
    if (!authReady) return

    // 🔧 STEP 2: 特別ケース - マイページのプレビューデータ
    const isMyPage = typeof window !== 'undefined' && window.location.pathname.includes('/mypage')
    const hasPreviewData = typeof window !== 'undefined' && (
      localStorage.getItem('previewCompleteData') ||
      localStorage.getItem('updateProfile') ||
      sessionStorage.getItem('previewData') ||
      Object.keys(sessionStorage).some(key => key.startsWith('previewData_'))
    )

    if (isMyPage && hasPreviewData && !user) return

    // 🔧 STEP 3: fromMyPage遷移は認証チェックスキップ
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('fromMyPage') === 'true') {
        hasRedirected.current = false
        return
      }
    }

    // 🔧 STEP 4: authReady後にuser無ければloginへ
    if (!user && !hasRedirected.current) {
      hasRedirected.current = true
      logger.debug('[AUTH_GUARD] redirect to /login')
      safeRouter.push('/login')
    }
  }, [user, authReady, isCurrentlyTestMode, safeRouter])

  // タイムアウト処理 - authReady基準
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authReady) {
        logger.warn('[AUTH_GUARD] timeout')
        setTimeoutReached(true)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [authReady])

  if (timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t.timeoutTitle}</h2>
          <p className="text-gray-600 mb-4">
            {t.timeoutMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#8b1a2e] text-white rounded hover:bg-[#6e1525]"
          >
            {t.reload}
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
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8b1a2e]" />
            <p className="text-gray-600">{commonT.loading}</p>
            <p className="text-xs text-gray-400 mt-2">
              {t.initializing} ({authReady ? t.done : t.processing})
            </p>
          </div>
        </div>
      )
    )
  }

  // 🔧 STEP 0: テストモードなら即座に表示
  if (isCurrentlyTestMode) {
    return <>{children}</>
  }

  // 🔧 STEP 1: fromMyPage遷移なら即座に表示
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('fromMyPage') === 'true') {
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
    return <>{children}</>
  }

  // 🔧 STEP 3: ユーザー認証済みなら表示
  if (user) {
    return <>{children}</>
  }

  // 🔧 STEP 4: 認証なし・テストモードでもないなら待機（redirectは useEffect で処理）
  return null
}