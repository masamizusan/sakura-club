'use client'

import { useEffect } from 'react'
import { setAuthPageMounted } from '@/store/authStore'

/**
 * AuthPageMarker - 認証ページ（login/signup）のマーカーコンポーネント
 *
 * このコンポーネントが login/signup ページにマウントされている間は
 * isAuthPageMounted = true となり、ユーザー切替警告がスキップされる。
 *
 * パス文字列判定の race condition を完全に排除するための設計。
 */
export function AuthPageMarker() {
  useEffect(() => {
    // マウント時: フラグを true に
    console.warn('[AUTH_PAGE_MARKER] mounted - setting isAuthPageMounted=true')
    setAuthPageMounted(true)

    // アンマウント時: フラグを false に戻す（cleanup）
    return () => {
      console.warn('[AUTH_PAGE_MARKER] unmounted - setting isAuthPageMounted=false')
      setAuthPageMounted(false)
    }
  }, [])

  // UIは表示しない
  return null
}
