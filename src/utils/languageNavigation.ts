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
  
  // If no language in cookie, use plain path
  if (!language) {
    return params ? `${path}?${params.toString()}` : path
  }
  
  // Add language parameter to maintain language state
  const finalParams = params ? new URLSearchParams(params) : new URLSearchParams()
  finalParams.set('lang', language)
  
  return `${path}?${finalParams.toString()}`
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