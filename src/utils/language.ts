/**
 * 多言語対応ユーティリティ
 * 段階的実装: Phase 1 - 基本的な言語判定
 */

export type SupportedLanguage = 'ja' | 'en' | 'ko' | 'zh-tw'

// 国籍から言語を判定するマッピング
const NATIONALITY_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  // 英語圏
  'アメリカ': 'en',
  'イギリス': 'en',
  'カナダ': 'en',
  'オーストラリア': 'en',
  'ニュージーランド': 'en',
  'アイルランド': 'en',
  'ジャマイカ': 'en',
  'その他': 'en', // デフォルトは英語

  // 韓国語
  '韓国': 'ko',

  // 中国語（繁体字）
  '台湾': 'zh-tw',

  // 日本語
  '日本': 'ja',
}

/**
 * 国籍から適切な言語を取得
 */
export function getLanguageFromNationality(nationality: string | null | undefined): SupportedLanguage {
  if (!nationality) return 'en' // デフォルトは英語

  return NATIONALITY_TO_LANGUAGE[nationality] || 'en'
}

/**
 * 言語コードから表示名を取得
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
 * ブラウザの言語設定から推定
 */
export function getBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'ja'

  const browserLang = navigator.language || navigator.languages?.[0] || 'ja'

  if (browserLang.startsWith('en')) return 'en'
  if (browserLang.startsWith('ko')) return 'ko'
  if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-Hant')) return 'zh-tw'

  return 'ja' // デフォルトは日本語
}

/**
 * 言語設定をlocalStorageに保存
 */
export function saveLanguagePreference(language: SupportedLanguage): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferredLanguage', language)
  }
}

/**
 * localStorageから言語設定を取得
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
 * 最適な言語を決定（優先順位: localStorage > 国籍 > ブラウザ設定）
 */
export function determineLanguage(nationality?: string | null): SupportedLanguage {
  // 1. localStorageの設定を最優先
  const stored = getStoredLanguagePreference()
  if (stored) return stored

  // 2. 国籍から判定
  if (nationality) {
    const fromNationality = getLanguageFromNationality(nationality)
    if (fromNationality !== 'en' || nationality !== 'その他') {
      // 明確に特定の国籍の場合、または「その他」以外で英語になった場合
      return fromNationality
    }
  }

  // 3. ブラウザ設定から判定
  return getBrowserLanguage()
}