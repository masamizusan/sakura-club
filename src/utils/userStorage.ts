/**
 * ユーザー分離型ストレージユーティリティ
 *
 * 🚨 CRITICAL: 別タブ/別アカウントでのプロフィール混在を防止
 *
 * localStorage は同一ドメインで全タブ共有されるため、
 * ユーザーIDをキーのプレフィックスとして使用し、
 * 別ユーザーのデータが混入しないようにする。
 */

const STORAGE_PREFIX = 'sc_user_'

// ユーザー固有のキー一覧（これらはユーザー切替時にクリアする）
const USER_SPECIFIC_KEYS = [
  'currentProfileImages',
  'updateProfile',
  'previewCompleteData',
  'previewOptionalData',
  'previewExtendedInterests',
  'updateProfileTimestamp',
  'profileDraft',
  'cachedProfile',
]

/**
 * ユーザーIDを含むストレージキーを生成
 */
export function getUserStorageKey(userId: string | null | undefined, key: string): string {
  if (!userId) {
    // ユーザーIDがない場合は警告を出して通常キーを返す
    console.warn('⚠️ getUserStorageKey: userId is null/undefined, using non-namespaced key:', key)
    return key
  }
  return `${STORAGE_PREFIX}${userId}_${key}`
}

/**
 * ユーザー固有のlocalStorageに値を保存
 */
export function setUserStorage(userId: string | null | undefined, key: string, value: string): void {
  if (typeof window === 'undefined') return

  const storageKey = getUserStorageKey(userId, key)
  localStorage.setItem(storageKey, value)
  console.log('💾 setUserStorage:', { userId: userId?.slice(0, 8), key, storageKey })
}

/**
 * ユーザー固有のlocalStorageから値を取得
 */
export function getUserStorage(userId: string | null | undefined, key: string): string | null {
  if (typeof window === 'undefined') return null

  const storageKey = getUserStorageKey(userId, key)
  const value = localStorage.getItem(storageKey)

  // 後方互換性: 新キーがない場合は旧キーも確認（移行期間用）
  if (value === null && userId) {
    const legacyValue = localStorage.getItem(key)
    if (legacyValue) {
      console.warn('⚠️ getUserStorage: Found legacy non-namespaced key, migrating:', key)
      // 旧キーから新キーに移行
      localStorage.setItem(storageKey, legacyValue)
      localStorage.removeItem(key)
      return legacyValue
    }
  }

  return value
}

/**
 * ユーザー固有のlocalStorageから値を削除
 */
export function removeUserStorage(userId: string | null | undefined, key: string): void {
  if (typeof window === 'undefined') return

  const storageKey = getUserStorageKey(userId, key)
  localStorage.removeItem(storageKey)

  // 旧キーも念のため削除
  localStorage.removeItem(key)
}

/**
 * 🚨 CRITICAL: ユーザー切替時に前ユーザーのデータを全クリア
 *
 * authStore や AuthProvider で user.id が変わった時に呼び出す
 */
export function clearAllUserStorage(previousUserId?: string | null): void {
  if (typeof window === 'undefined') return

  console.log('🧹 clearAllUserStorage: Clearing all user-specific data', {
    previousUserId: previousUserId?.slice(0, 8)
  })

  // 1. 旧形式のキー（名前空間なし）を全て削除 — localStorage + sessionStorage
  const LEGACY_SESSION_KEYS = [
    'previewData', 'imageEditHistory', 'profileEditSaveDebug'
  ]
  USER_SPECIFIC_KEYS.forEach(key => {
    localStorage.removeItem(key)
  })
  LEGACY_SESSION_KEYS.forEach(key => {
    sessionStorage.removeItem(key)
  })

  // 2. 前ユーザーの名前空間付きキーを削除（localStorage + sessionStorage）
  if (previousUserId) {
    USER_SPECIFIC_KEYS.forEach(key => {
      const storageKey = getUserStorageKey(previousUserId, key)
      localStorage.removeItem(storageKey)
    })
    // sessionStorage: previewData_${userId}, currentProfileImages_${userId}, etc.
    const sessionNamespacedPrefixes = [
      `previewData_${previousUserId}`,
      `currentProfileImages_${previousUserId}`,
      `imageStateTimestamp_${previousUserId}`,
      `imageChangeTime_${previousUserId}`,
      `writeBack_${previousUserId}_completed`,
    ]
    sessionNamespacedPrefixes.forEach(key => {
      sessionStorage.removeItem(key)
    })
  }

  // 3. プレフィックス付きの全キーを削除（安全策）— localStorage
  const lsKeysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      lsKeysToRemove.push(key)
    }
  }
  lsKeysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })

  // 4. sessionStorage: previewData_ / currentProfileImages_ 等の全namespaced keyを削除
  const ssKeysToRemove: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && (
      key.startsWith('previewData_') ||
      key.startsWith('currentProfileImages_') ||
      key.startsWith('imageStateTimestamp_') ||
      key.startsWith('imageChangeTime_') ||
      key.startsWith('writeBack_')
    )) {
      ssKeysToRemove.push(key)
    }
  }
  ssKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key)
  })

  console.log('✅ clearAllUserStorage: Cleared', lsKeysToRemove.length, 'ls +', ssKeysToRemove.length, 'ss namespaced keys + legacy keys')
}

/**
 * 現在のユーザーIDを検証し、不一致なら警告
 */
export function validateStorageUserId(
  expectedUserId: string | null | undefined,
  storageKey: string,
  storedData: any
): boolean {
  if (!expectedUserId) {
    console.warn('⚠️ validateStorageUserId: No expected userId')
    return false
  }

  // storedData に userId が含まれている場合、一致を確認
  if (storedData && typeof storedData === 'object' && storedData.userId) {
    if (storedData.userId !== expectedUserId) {
      console.error('🚨 STORAGE USER MISMATCH:', {
        storageKey,
        expectedUserId: expectedUserId.slice(0, 8),
        storedUserId: storedData.userId?.slice(0, 8),
        action: 'REJECTING_DATA'
      })
      return false
    }
  }

  return true
}

/**
 * デバッグ用: 現在のユーザー関連ストレージを全て出力
 */
export function debugUserStorage(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return

  console.group('🔍 DEBUG: User Storage State')
  console.log('Current userId:', userId?.slice(0, 8))

  // 旧形式キー
  console.log('--- Legacy Keys (non-namespaced) ---')
  USER_SPECIFIC_KEYS.forEach(key => {
    const value = localStorage.getItem(key)
    if (value) {
      console.warn('⚠️ LEGACY KEY FOUND:', key, '=', value.slice(0, 50) + '...')
    }
  })

  // 名前空間付きキー
  console.log('--- Namespaced Keys ---')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key)
      console.log(key, '=', value?.slice(0, 50) + '...')
    }
  }

  console.groupEnd()
}
