'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { setCurrentPath } from '@/store/authStore'

/**
 * AuthSwitchGuard - タブ間ユーザー切替検出のためのパス同期コンポーネント
 *
 * Next.js App Router では window.location.pathname が実際の表示パスと
 * ズレることがあるため、usePathname() で正確なパスを取得し、
 * authStore に同期する。
 */
export function AuthSwitchGuard() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      console.warn('[AUTH_PATH] pathname updated:', pathname)
      setCurrentPath(pathname)
    }
  }, [pathname])

  // 初回マウント時にも確実にセット
  useEffect(() => {
    if (pathname) {
      console.warn('[AUTH_PATH] initial mount:', pathname)
      setCurrentPath(pathname)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // UIは表示しない
  return null
}
