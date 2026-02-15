'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// sessionStorage キー（authStore.ts と共有）
const PATH_NOW_KEY = '__path_now__'

/**
 * AuthSwitchGuard - タブ間ユーザー切替検出のためのパス同期コンポーネント
 *
 * 🚨 CRITICAL: window.location.pathname は Next.js ルーティング中に
 * 一時的に別のパスを返すことがある（例：/mypage 表示中に /login を返す）
 *
 * 解決策:
 * 1. sessionStorage に正確なパスを保存（最優先ソース）
 * 2. document.body.dataset.page にも設定（バックアップ）
 * 3. authStore.ts の getPathNow() は sessionStorage を最優先で参照
 */
export function AuthSwitchGuard() {
  const pathname = usePathname()

  // 🚨 CRITICAL: 初回クライアント実行で即座にパスを設定
  // usePathname がまだ来ない瞬間の穴埋め
  useEffect(() => {
    const initialPath = window.location.pathname
    if (initialPath) {
      sessionStorage.setItem(PATH_NOW_KEY, initialPath)
      document.body.dataset.page = initialPath
      console.warn('[AUTH_PATH] IMMEDIATE set (location):', initialPath)
    }
  }, [])

  // usePathname からの正確なパスを設定（React hydration後）
  useEffect(() => {
    if (pathname) {
      // sessionStorage（最優先ソース）
      sessionStorage.setItem(PATH_NOW_KEY, pathname)
      // DOM dataset（バックアップ）
      document.body.dataset.page = pathname
      console.warn('[AUTH_PATH] set (usePathname):', pathname)
    }
  }, [pathname])

  // UIは表示しない
  return null
}
