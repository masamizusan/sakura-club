/**
 * Language-aware navigation utilities
 * Ensures language persistence during navigation
 */

import { useRouter } from 'next/navigation'
import { getLanguageFromCookie } from './languageCookie'

/**
 * Create a language-aware URL that preserves user's language choice
 */
export function createLanguageAwareUrl(path: string, params?: URLSearchParams): string {
  const language = getLanguageFromCookie()

  // pathに既存のクエリパラメータがある場合を考慮してURLオブジェクトで処理
  // 相対パスをパースするためダミーベースを使用
  const base = 'http://dummy'
  const url = new URL(path, base)

  // 追加パラメータをマージ
  if (params) {
    params.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  }

  // 言語パラメータを追加
  if (language) {
    url.searchParams.set('lang', language)
  }

  // ダミーベースを除去してパス+クエリを返す
  return url.pathname + url.search
}

/**
 * Hook for language-aware navigation
 */
export function useLanguageAwareRouter() {
  const router = useRouter()
  
  const push = (path: string, params?: URLSearchParams) => {
    const languageAwareUrl = createLanguageAwareUrl(path, params)
    console.log('🌍 Language-aware navigation:', languageAwareUrl)
    router.push(languageAwareUrl)
  }
  
  const replace = (path: string, params?: URLSearchParams) => {
    const languageAwareUrl = createLanguageAwareUrl(path, params)
    console.log('🌍 Language-aware replace:', languageAwareUrl)
    router.replace(languageAwareUrl)
  }
  
  return {
    push,
    replace,
    refresh: router.refresh,
    back: router.back,
    forward: router.forward
  }
}

/**
 * Direct window navigation with language preservation (for fallback scenarios)
 */
export function navigateWithLanguage(path: string, params?: URLSearchParams) {
  const languageAwareUrl = createLanguageAwareUrl(path, params)
  console.log('🌍 Direct language navigation:', languageAwareUrl)
  window.location.href = languageAwareUrl
}