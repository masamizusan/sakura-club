/**
 * Cookie-based language persistence system
 * Implements the NEXT_LOCALE standard for permanent language storage
 */

import { SupportedLanguage } from './language'

const LANGUAGE_COOKIE_NAME = 'NEXT_LOCALE'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year in seconds

/**
 * Save language preference to cookie with 1 year expiry
 */
export function saveLanguageToCookie(language: SupportedLanguage): void {
  if (typeof document === 'undefined') return

  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
  
  console.log(`🍪 Language saved to cookie: ${language}`)
}

/**
 * Get language preference from cookie
 */
export function getLanguageFromCookie(): SupportedLanguage | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  const languageCookie = cookies.find(cookie => 
    cookie.trim().startsWith(`${LANGUAGE_COOKIE_NAME}=`)
  )

  if (!languageCookie) return null

  const language = languageCookie.split('=')[1]?.trim()
  if (language && ['ja', 'en', 'ko', 'zh-tw'].includes(language)) {
    return language as SupportedLanguage
  }

  return null
}

/**
 * Server-side cookie parsing for SSR
 */
export function parseLanguageFromCookieString(cookieString?: string): SupportedLanguage | null {
  if (!cookieString) return null

  const cookies = cookieString.split(';')
  const languageCookie = cookies.find(cookie => 
    cookie.trim().startsWith(`${LANGUAGE_COOKIE_NAME}=`)
  )

  if (!languageCookie) return null

  const language = languageCookie.split('=')[1]?.trim()
  if (language && ['ja', 'en', 'ko', 'zh-tw'].includes(language)) {
    return language as SupportedLanguage
  }

  return null
}

/**
 * Enhanced browser language detection with more comprehensive mapping
 */
export function getBrowserLanguageEnhanced(): SupportedLanguage {
  if (typeof window === 'undefined') return 'ja' // Server-side default

  const languages = navigator.languages || [navigator.language || 'ja']
  
  for (const lang of languages) {
    const normalizedLang = lang.toLowerCase()
    
    // English variations
    if (normalizedLang.startsWith('en')) return 'en'
    
    // Korean variations
    if (normalizedLang.startsWith('ko')) return 'ko'
    
    // Traditional Chinese variations (Taiwan, Hong Kong, Macau)
    if (normalizedLang.startsWith('zh-tw') || 
        normalizedLang.startsWith('zh-hant') ||
        normalizedLang.startsWith('zh-mo') ||
        normalizedLang.startsWith('zh-hk')) {
      return 'zh-tw'
    }
    
    // Japanese variations
    if (normalizedLang.startsWith('ja')) return 'ja'
  }

  // Default fallback
  return 'ja'
}

/**
 * Determine optimal language with new priority system
 * Priority: Cookie > URL > Accept-Language > ja
 */
export function determineLanguageWithCookie(
  cookieString?: string,
  urlLocale?: string,
  nationality?: string
): SupportedLanguage {
  // 1. Prioritize cookie (user's last choice)
  const cookieLanguage = cookieString 
    ? parseLanguageFromCookieString(cookieString)
    : getLanguageFromCookie()
  
  if (cookieLanguage) {
    console.log(`🍪 Using cookie language: ${cookieLanguage}`)
    return cookieLanguage
  }

  // 2. URL locale (for next-intl compatibility)
  if (urlLocale && ['ja', 'en', 'ko', 'zh-tw'].includes(urlLocale)) {
    console.log(`🔗 Using URL locale: ${urlLocale}`)
    return urlLocale as SupportedLanguage
  }

  // 3. Browser Accept-Language (initial visit only)
  const browserLanguage = getBrowserLanguageEnhanced()
  console.log(`🌐 Using browser language: ${browserLanguage}`)
  return browserLanguage
}