/**
 * Multilingual support utilities
 * Gradual implementation: Phase 1 - Basic language detection
 */

export type SupportedLanguage = 'ja' | 'en' | 'ko' | 'zh-tw'

// Mapping to determine language from nationality
const NATIONALITY_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  // English-speaking countries
  'アメリカ': 'en',
  'イギリス': 'en',
  'カナダ': 'en',
  'オーストラリア': 'en',
  'ニュージーランド': 'en',
  'アイルランド': 'en',
  'ジャマイカ': 'en',
  'その他': 'en', // Default is English

  // Korean
  '韓国': 'ko',

  // Traditional Chinese
  '台湾': 'zh-tw',

  // Japanese
  '日本': 'ja',
}

/**
 * Get appropriate language from nationality
 */
export function getLanguageFromNationality(nationality: string | null | undefined): SupportedLanguage {
  if (!nationality) return 'en' // Default is English

  return NATIONALITY_TO_LANGUAGE[nationality] || 'en'
}

/**
 * Get display name from language code
 */
export function getLanguageDisplayName(language: SupportedLanguage): string {
  const displayNames: Record<SupportedLanguage, string> = {
    'ja': '日本語',
    'en': 'English',
    'ko': '한국어',
    'zh-tw': '繁體中文'
  }

  return displayNames[language]
}

/**
 * Infer from browser language settings
 */
export function getBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'ja' // Server-side default

  const browserLang = navigator.language || navigator.languages?.[0] || 'ja'

  if (browserLang.startsWith('en')) return 'en'
  if (browserLang.startsWith('ko')) return 'ko'
  if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-Hant')) return 'zh-tw'

  return 'ja' // Default is Japanese
}

/**
 * Save language preference to localStorage
 */
export function saveLanguagePreference(language: SupportedLanguage): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferredLanguage', language)
  }
}

/**
 * Get language preference from localStorage
 */
export function getStoredLanguagePreference(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem('preferredLanguage')
  if (stored && ['ja', 'en', 'ko', 'zh-tw'].includes(stored)) {
    return stored as SupportedLanguage
  }

  return null
}

/**
 * Determine optimal language (priority: localStorage > nationality > browser settings)
 */
export function determineLanguage(nationality?: string | null): SupportedLanguage {
  // 1. Prioritize localStorage settings
  const stored = getStoredLanguagePreference()
  if (stored) return stored

  // 2. Determine from nationality
  if (nationality) {
    const fromNationality = getLanguageFromNationality(nationality)
    if (fromNationality !== 'en' || nationality !== 'その他') {
      // For clearly specified nationalities, or when English is assigned for non-'other' cases
      return fromNationality
    }
  }

  // 3. Determine from browser settings
  return getBrowserLanguage()
}