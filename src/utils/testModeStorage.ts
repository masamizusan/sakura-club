/**
 * テストモード専用ストレージ管理ユーティリティ
 * 本番環境のセッション混入を防ぐため、専用のkey prefix使用
 */

const TEST_MODE_PREFIX = 'sakura_test_'
const PROD_MODE_PREFIX = 'sakura_prod_'

// テストモード検出関数（統一）
export const isTestModeActive = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  const pathname = window.location.pathname
  
  return !!(
    urlParams.get('dev') === 'skip-verification' ||
    urlParams.get('devTest') === 'true' ||
    localStorage.getItem('devTestMode') === 'true' ||
    pathname.includes('/test') ||
    (pathname.includes('/profile/edit') && 
     (urlParams.get('type') || urlParams.get('gender') || urlParams.get('nickname')) &&
     urlParams.get('fromMyPage') !== 'true')
  )
}

// 現在のモードに応じたkey prefix取得
const getStoragePrefix = (): string => {
  return isTestModeActive() ? TEST_MODE_PREFIX : PROD_MODE_PREFIX
}

// ユーザー別キー生成（TEST MODE対応）
const getUserSpecificKey = (baseKey: string, userId?: string): string => {
  const prefix = getStoragePrefix()
  const userSuffix = userId ? `_${userId}` : '_anonymous'
  return `${prefix}${baseKey}${userSuffix}`
}

// 安全なlocalStorage操作
export const safeLocalStorage = {
  setItem: (key: string, value: string): void => {
    try {
      const prefixedKey = getStoragePrefix() + key
      console.log(`📦 Storage set (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, prefixedKey)
      localStorage.setItem(prefixedKey, value)
    } catch (error) {
      console.error('LocalStorage setItem error:', error)
    }
  },

  getItem: (key: string): string | null => {
    try {
      const prefixedKey = getStoragePrefix() + key
      const value = localStorage.getItem(prefixedKey)
      console.log(`📦 Storage get (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, prefixedKey, !!value)
      return value
    } catch (error) {
      console.error('LocalStorage getItem error:', error)
      return null
    }
  },

  removeItem: (key: string): void => {
    try {
      const prefixedKey = getStoragePrefix() + key
      console.log(`🗑️ Storage remove (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, prefixedKey)
      localStorage.removeItem(prefixedKey)
    } catch (error) {
      console.error('LocalStorage removeItem error:', error)
    }
  },

  // 現在のモードのストレージをクリア
  clearCurrentModeStorage: (): void => {
    try {
      const prefix = getStoragePrefix()
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log(`🧹 Cleared ${isTestModeActive() ? 'TEST' : 'PROD'} mode storage:`, keysToRemove.length, 'items')
    } catch (error) {
      console.error('Clear storage error:', error)
    }
  }
}

// 安全なsessionStorage操作
export const safeSessionStorage = {
  setItem: (key: string, value: string): void => {
    try {
      const prefixedKey = getStoragePrefix() + key
      console.log(`📝 Session set (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, prefixedKey)
      sessionStorage.setItem(prefixedKey, value)
    } catch (error) {
      console.error('SessionStorage setItem error:', error)
    }
  },

  getItem: (key: string): string | null => {
    try {
      const prefixedKey = getStoragePrefix() + key
      const value = sessionStorage.getItem(prefixedKey)
      console.log(`📝 Session get (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, prefixedKey, !!value)
      return value
    } catch (error) {
      console.error('SessionStorage getItem error:', error)
      return null
    }
  },

  removeItem: (key: string): void => {
    try {
      const prefixedKey = getStoragePrefix() + key
      console.log(`🗑️ Session remove (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, prefixedKey)
      sessionStorage.removeItem(prefixedKey)
    } catch (error) {
      console.error('SessionStorage removeItem error:', error)
    }
  },

  // 現在のモードのセッションストレージをクリア
  clearCurrentModeStorage: (): void => {
    try {
      const prefix = getStoragePrefix()
      const keysToRemove: string[] = []
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key))
      console.log(`🧹 Cleared ${isTestModeActive() ? 'TEST' : 'PROD'} mode session:`, keysToRemove.length, 'items')
    } catch (error) {
      console.error('Clear session storage error:', error)
    }
  }
}

// ユーザー別localStorage操作（推奨）
export const safeUserStorage = {
  setItem: (key: string, value: string, userId?: string): void => {
    try {
      const userSpecificKey = getUserSpecificKey(key, userId)
      console.log(`📦 User Storage set (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, userSpecificKey)
      localStorage.setItem(userSpecificKey, value)
    } catch (error) {
      console.error('User localStorage setItem error:', error)
    }
  },

  getItem: (key: string, userId?: string): string | null => {
    try {
      const userSpecificKey = getUserSpecificKey(key, userId)
      const value = localStorage.getItem(userSpecificKey)
      console.log(`📦 User Storage get (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, userSpecificKey, !!value)
      return value
    } catch (error) {
      console.error('User localStorage getItem error:', error)
      return null
    }
  },

  removeItem: (key: string, userId?: string): void => {
    try {
      const userSpecificKey = getUserSpecificKey(key, userId)
      console.log(`🗑️ User Storage remove (${isTestModeActive() ? 'TEST' : 'PROD'} mode):`, userSpecificKey)
      localStorage.removeItem(userSpecificKey)
    } catch (error) {
      console.error('User localStorage removeItem error:', error)
    }
  }
}