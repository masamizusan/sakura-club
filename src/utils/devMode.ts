import { logger } from '@/utils/logger'
/**
 * 開発テストモード用のユーティリティ関数
 */

export function enableDevTestMode() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('devTestMode', 'true')
    logger.debug('🧪 Dev test mode enabled')
  }
}

export function disableDevTestMode() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('devTestMode')
    logger.debug('❌ Dev test mode disabled')
  }
}

export function isDevTestModeEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('devTest') === 'true' || localStorage.getItem('devTestMode') === 'true'
  }
  return false
}

export function getDevTestUrl(baseUrl: string): string {
  const url = new URL(baseUrl, window.location.origin)
  url.searchParams.set('devTest', 'true')
  return url.toString()
}