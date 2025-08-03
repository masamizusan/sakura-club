import { useLocale } from 'next-intl'
import { type Locale } from '@/i18n'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatDistance,
  formatTimeRange,
  formatFileSize
} from '@/lib/intl-formatting'

export function useIntlFormatting() {
  const locale = useLocale() as Locale

  return {
    // 日付・時間関連
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, locale, options),
    
    formatDateTime: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(date, locale, options),
    
    formatRelativeTime: (date: Date | string) =>
      formatRelativeTime(date, locale),
    
    formatTimeRange: (startTime: string, endTime: string) =>
      formatTimeRange(startTime, endTime, locale),

    // 数値関連
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),
    
    formatCurrency: (amount: number, currency?: string) =>
      formatCurrency(amount, locale, currency),
    
    formatPercentage: (value: number, options?: Intl.NumberFormatOptions) =>
      formatPercentage(value, locale, options),

    // その他
    formatDistance: (kilometers: number) =>
      formatDistance(kilometers, locale),
    
    formatFileSize: (bytes: number, decimals?: number) =>
      formatFileSize(bytes, locale, decimals),

    // 現在のロケール
    locale
  }
}

// サーバーサイドでも使用できるヘルパー関数
export function createIntlFormatter(locale: Locale) {
  return {
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, locale, options),
    
    formatDateTime: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(date, locale, options),
    
    formatRelativeTime: (date: Date | string) =>
      formatRelativeTime(date, locale),
    
    formatTimeRange: (startTime: string, endTime: string) =>
      formatTimeRange(startTime, endTime, locale),

    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),
    
    formatCurrency: (amount: number, currency?: string) =>
      formatCurrency(amount, locale, currency),
    
    formatPercentage: (value: number, options?: Intl.NumberFormatOptions) =>
      formatPercentage(value, locale, options),

    formatDistance: (kilometers: number) =>
      formatDistance(kilometers, locale),
    
    formatFileSize: (bytes: number, decimals?: number) =>
      formatFileSize(bytes, locale, decimals),

    locale
  }
}