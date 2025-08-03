import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

// サポートする言語の一覧
export const locales = ['ja', 'en', 'zh', 'ko'] as const
export type Locale = typeof locales[number]

// デフォルト言語
export const defaultLocale: Locale = 'ja'

// 言語表示名の設定
export const localeNames: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
  zh: '中文',
  ko: '한국어'
}

// 言語コードとフラグの対応
export const localeFlags: Record<Locale, string> = {
  ja: '🇯🇵',
  en: '🇺🇸',
  zh: '🇨🇳',
  ko: '🇰🇷'
}

// 右から左に書く言語（RTL）の設定
export const rtlLocales: Locale[] = []

// 言語の検証
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

// next-intlの設定
export default getRequestConfig(async ({ locale }) => {
  // 無効な言語の場合は404を返す
  if (!isValidLocale(locale as string)) {
    notFound()
  }

  return {
    locale: locale as string,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Asia/Tokyo',
    // 数値フォーマット
    formats: {
      dateTime: {
        short: {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        },
        long: {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long'
        }
      },
      number: {
        currency: {
          style: 'currency',
          currency: locale === 'ja' ? 'JPY' : 'USD'
        }
      }
    }
  }
})