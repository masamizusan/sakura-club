'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * AuthSwitchGuard - タブ間ユーザー切替検出のためのパス同期コンポーネント
 *
 * 🚨 CRITICAL: window.location.pathname は Next.js ルーティング中に
 * 一時的に別のパスを返すことがある（例：/mypage 表示中に /login を返す）
 *
 * 解決策: usePathname() で取得した正確なパスを document.body.dataset.page に設定
 * authStore.ts の isAuthPageNow() はこの値を参照する
 */
export function AuthSwitchGuard() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      // 🚨 CRITICAL: DOM基準でパスを設定（window.location.pathname の誤判定を防ぐ）
      document.body.dataset.page = pathname
      console.warn('[AUTH_PATH] dataset.page set:', pathname)
    }
  }, [pathname])

  // 初回マウント時にも確実にセット
  useEffect(() => {
    if (pathname) {
      document.body.dataset.page = pathname
      console.warn('[AUTH_PATH] initial dataset.page:', pathname)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // UIは表示しない
  return null
}
