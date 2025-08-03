import { type Locale } from '@/i18n'

// 日付フォーマット関数
export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  }

  const localeMap = {
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR'
  }

  return new Intl.DateTimeFormat(
    localeMap[locale],
    { ...defaultOptions, ...options }
  ).format(dateObj)
}

// 日時フォーマット関数
export function formatDateTime(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  }

  const localeMap = {
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR'
  }

  return new Intl.DateTimeFormat(
    localeMap[locale],
    { ...defaultOptions, ...options }
  ).format(dateObj)
}

// 相対時間フォーマット関数（例：2時間前、3日前など）
export function formatRelativeTime(
  date: Date | string,
  locale: Locale
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  const localeMap = {
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR'
  }

  const rtf = new Intl.RelativeTimeFormat(localeMap[locale], {
    numeric: 'auto',
    style: 'short'
  })

  // 1分未満
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second')
  }
  
  // 1時間未満
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return rtf.format(-diffInMinutes, 'minute')
  }
  
  // 1日未満
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return rtf.format(-diffInHours, 'hour')
  }
  
  // 1週間未満
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return rtf.format(-diffInDays, 'day')
  }
  
  // 1ヶ月未満
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return rtf.format(-diffInWeeks, 'week')
  }
  
  // それ以上
  const diffInMonths = Math.floor(diffInDays / 30)
  return rtf.format(-diffInMonths, 'month')
}

// 数値フォーマット関数
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const localeMap = {
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR'
  }

  return new Intl.NumberFormat(
    localeMap[locale],
    options
  ).format(value)
}

// 通貨フォーマット関数
export function formatCurrency(
  amount: number,
  locale: Locale,
  currency?: string
): string {
  const defaultCurrency = locale === 'ja' ? 'JPY' : 'USD'
  const currencyCode = currency || defaultCurrency

  const localeMap = {
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR'
  }

  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'symbol'
  }).format(amount)
}

// パーセンテージフォーマット関数
export function formatPercentage(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const localeMap = {
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR'
  }

  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }

  return new Intl.NumberFormat(
    localeMap[locale],
    { ...defaultOptions, ...options }
  ).format(value / 100)
}

// 距離フォーマット関数
export function formatDistance(
  kilometers: number,
  locale: Locale
): string {
  const formattedNumber = formatNumber(kilometers, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })

  const units = {
    ja: 'km',
    en: 'km',
    zh: '公里',
    ko: 'km'
  }

  return `${formattedNumber}${units[locale]}`
}

// 時間範囲フォーマット関数
export function formatTimeRange(
  startTime: string,
  endTime: string,
  locale: Locale
): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: locale !== 'ja'
    }).format(date)
  }

  const start = formatTime(startTime)
  const end = formatTime(endTime)

  const separators = {
    ja: '〜',
    en: ' - ',
    zh: ' - ',
    ko: ' - '
  }

  return `${start}${separators[locale]}${end}`
}

// ファイルサイズフォーマット関数
export function formatFileSize(
  bytes: number,
  locale: Locale,
  decimals: number = 2
): string {
  if (bytes === 0) {
    const zeroLabels = {
      ja: '0バイト',
      en: '0 Bytes',
      zh: '0字节',
      ko: '0바이트'
    }
    return zeroLabels[locale]
  }

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  
  const sizes = {
    ja: ['バイト', 'KB', 'MB', 'GB', 'TB'],
    en: ['Bytes', 'KB', 'MB', 'GB', 'TB'],
    zh: ['字节', 'KB', 'MB', 'GB', 'TB'],
    ko: ['바이트', 'KB', 'MB', 'GB', 'TB']
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const formattedNumber = formatNumber(
    parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
    locale
  )

  return `${formattedNumber} ${sizes[locale][i]}`
}