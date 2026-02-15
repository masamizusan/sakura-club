import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// =====================================================
// 🚨 CRITICAL: Cross-Tab認証検知 - sessionStorageベース
//
// 原則: Supabase/Zustand/グローバル変数は一切信用しない
// sessionStorageに保存した「このタブの元ユーザーID」のみを使用
// =====================================================

// =====================================================
// 1️⃣ タブ固有ID（sessionStorage）
// =====================================================
const TAB_ID_KEY = '__sakura_tab_id__'

function getTabId(): string {
  if (typeof window === 'undefined') return 'server'

  let id = sessionStorage.getItem(TAB_ID_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2, 8)
    sessionStorage.setItem(TAB_ID_KEY, id)
  }
  return id
}

const tabId = getTabId()

// =====================================================
// 2️⃣ 基準ユーザーID（最重要）
// - 初回ログイン時のみ設定
// - switch時は触らない
// - logout時のみ remove
// =====================================================
const BASE_USER_KEY = '__base_user_id__'

function getBaseUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(BASE_USER_KEY)
}

function setBaseUserId(userId: string) {
  if (typeof window === 'undefined') return
  // 既に設定されている場合は上書きしない（操作タブからの明示的更新以外）
  sessionStorage.setItem(BASE_USER_KEY, userId)
  console.warn(`[BASE_USER][${tabId}] set:`, userId.slice(0, 8))
}

function clearBaseUserId() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(BASE_USER_KEY)
  console.warn(`[BASE_USER][${tabId}] cleared`)
}

// =====================================================
// 3️⃣ ログイン操作フラグ（操作タブ識別）
// =====================================================
const AUTH_ACTION_KEY = '__auth_action__'

function setAuthActionFlag() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(AUTH_ACTION_KEY, '1')
  console.warn(`[AUTH_ACTION][${tabId}] flag set`)
}

function clearAuthActionFlag() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(AUTH_ACTION_KEY)
  console.warn(`[AUTH_ACTION][${tabId}] flag cleared`)
}

function hasAuthActionFlag(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(AUTH_ACTION_KEY) === '1'
}

// Export for login/signup pages
export { setAuthActionFlag as setAuthActionInThisTab, clearAuthActionFlag as clearAuthActionInThisTab }

// =====================================================
// 5️⃣ isAuthPageNow() - pathnameのみ（mountedフラグ完全削除）
// =====================================================
function isAuthPageNow(): boolean {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === '/login' || path === '/signup' ||
         path.startsWith('/login/') || path.startsWith('/signup/')
}

// =====================================================
// タブ間通信
// =====================================================
const AUTH_CHANNEL_NAME = 'auth-switch'
const CROSS_TAB_AUTH_KEY = '__auth_switch__'

// ループ防止
let hasShownAlert = false
let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 3000

// =====================================================
// showAlertAndReload
// =====================================================
function showAlertAndReload() {
  if (typeof window === 'undefined') return

  const now = Date.now()
  if (hasShownAlert || (now - lastAlertAt) < ALERT_COOLDOWN_MS) {
    console.warn(`[CROSS_TAB][${tabId}] alert cooldown - skipping`)
    return
  }

  hasShownAlert = true
  lastAlertAt = now

  console.error(`[CROSS_TAB][${tabId}] 🚨 ALERT - showing dialog`)

  window.alert('別タブでログインが行われました。再読み込みします。')
  window.location.reload()
}

// =====================================================
// 4️⃣ 判定ロジック（唯一これだけ）
// =====================================================
function handleIncomingAuthSwitch(payload: any) {
  if (!payload) return
  if (typeof window === 'undefined') return

  const incomingUserId = payload.userId
  const fromTab = payload.fromTab
  const baseUserId = getBaseUserId()
  const isAuthPage = isAuthPageNow()

  console.warn(`[CROSS_TAB][${tabId}] comparing:`, {
    incoming: incomingUserId?.slice(0, 8) || 'null',
    base: baseUserId?.slice(0, 8) || 'null',
    fromTab: fromTab?.slice(0, 6) || 'null',
    myTabId: tabId,
    isAuthPage,
    path: window.location.pathname
  })

  // 自タブからのbroadcastは無視
  if (fromTab === tabId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (from self)`)
    return
  }

  // 認証ページでは警告しない
  if (isAuthPage) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (on auth page: ${window.location.pathname})`)
    return
  }

  // baseUserIdがなければ無視（未ログイン状態）
  if (!baseUserId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (no baseUserId)`)
    return
  }

  // 🚨 核心判定: incoming !== base なら即 alert
  if (incomingUserId && incomingUserId !== baseUserId) {
    console.error(`[CROSS_TAB][${tabId}] USER MISMATCH!`, {
      incoming: incomingUserId.slice(0, 8),
      base: baseUserId.slice(0, 8)
    })
    console.error(`[CROSS_TAB][${tabId}] ALERT`)
    showAlertAndReload()
  } else {
    console.warn(`[CROSS_TAB][${tabId}] same user or null - no alert`)
  }
}

// =====================================================
// BroadcastChannel + storage listener（モジュールトップレベル）
// =====================================================
let authChannel: BroadcastChannel | null = null

if (typeof window !== 'undefined') {
  try {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    authChannel.onmessage = (event) => {
      const payload = event.data || {}
      if (payload.userId !== undefined) {
        console.warn(`[BROADCAST][${tabId}] received:`, {
          userId: payload.userId?.slice(0, 8) || 'null',
          fromTab: payload.fromTab
        })
        handleIncomingAuthSwitch(payload)
      }
    }
    console.warn(`[AUTH_LISTENER][${tabId}] BroadcastChannel READY`)
  } catch (e) {
    console.warn(`[AUTH_LISTENER][${tabId}] BroadcastChannel not supported`)
    authChannel = null
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== CROSS_TAB_AUTH_KEY || !event.newValue) return

    try {
      const payload = JSON.parse(event.newValue)
      console.warn(`[STORAGE][${tabId}] event received:`, {
        userId: payload.userId?.slice(0, 8) || 'null',
        fromTab: payload.fromTab
      })
      handleIncomingAuthSwitch(payload)
    } catch (e) {
      console.warn(`[STORAGE][${tabId}] parse error`)
    }
  })
  console.warn(`[AUTH_LISTENER][${tabId}] storage READY`)
}

// =====================================================
// broadcastAuthChange
// =====================================================
function broadcastAuthChange(userId: string | null, source: string) {
  if (typeof window === 'undefined') return

  const payload = {
    userId,
    fromTab: tabId,
    at: Date.now()
  }

  if (authChannel) {
    try {
      authChannel.postMessage(payload)
      console.warn(`[BROADCAST][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)
    } catch (e) {
      console.warn(`[BROADCAST][${tabId}] send failed`)
    }
  }

  try {
    localStorage.setItem(CROSS_TAB_AUTH_KEY, JSON.stringify(payload))
    console.warn(`[STORAGE][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)
  } catch (e) {
    console.warn(`[STORAGE][${tabId}] send failed`)
  }
}

export const notifyAuthChange = (userId: string | null) => {
  broadcastAuthChange(userId, 'explicit')
}

// =====================================================
// 後方互換性のためのダミーexport（使用禁止）
// =====================================================
export function setAuthPageMounted(_mounted: boolean) {
  // 🚨 この関数は何もしない（mountedフラグは完全廃止）
}

export function setCurrentPath(_path: string) {
  // 🚨 この関数は何もしない
}

// =====================================================
// Zustand Store
// =====================================================
interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  isInitializing: boolean
  authReady: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
  signOut: () => Promise<void>
}

let globalInitialized = false
let globalInitializing = false

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  isInitializing: false,
  authReady: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),

  initialize: async () => {
    const state = get()

    if (globalInitialized || globalInitializing || state.isInitialized || state.isInitializing) {
      logger.debug(`[AUTH_INIT][${tabId}] skipped`)
      return
    }

    try {
      globalInitializing = true
      set({ isLoading: true, isInitializing: true })

      logger.debug(`[AUTH_INIT][${tabId}] starting`)
      const user = await authService.getCurrentUser()

      // 初回ログイン時のみ baseUserId を設定
      if (user?.id && !getBaseUserId()) {
        setBaseUserId(user.id)
      }

      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      logger.debug(`[AUTH_INIT][${tabId}] ready`, { hasUser: !!user })

      // =====================================================
      // 7️⃣ onAuthStateChange 処理
      // =====================================================
      authService.onAuthStateChange((newUser) => {
        const newUserId = newUser?.id || null
        const baseUserId = getBaseUserId()
        const isAuthPage = isAuthPageNow()
        const hasActionFlag = hasAuthActionFlag()

        console.warn(`[AUTH_SWITCH][${tabId}] onAuthStateChange:`, {
          new: newUserId?.slice(0, 8) || 'none',
          base: baseUserId?.slice(0, 8) || 'none',
          isAuthPage,
          hasActionFlag,
          path: typeof window !== 'undefined' ? window.location.pathname : 'server'
        })

        // null → user（初回ログイン）
        if (!baseUserId && newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] initial login`)
          setBaseUserId(newUserId)
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'initial')
          clearAuthActionFlag()
          return
        }

        // user → null（ログアウト）
        if (baseUserId && !newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] logout`)
          clearBaseUserId()
          set({ user: null })
          broadcastAuthChange(null, 'logout')
          return
        }

        // 同一ユーザー
        if (baseUserId === newUserId) {
          // Zustand stateだけ更新
          set({ user: newUser })
          return
        }

        // user → different user（ユーザー切替）
        if (baseUserId && newUserId && baseUserId !== newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] USER SWITCH!`, {
            base: baseUserId.slice(0, 8),
            new: newUserId.slice(0, 8),
            isAuthPage,
            hasActionFlag
          })

          // 🚨 操作タブ（login/signup + AUTH_ACTION）
          if (isAuthPage && hasActionFlag) {
            console.warn(`[AUTH_SWITCH][${tabId}] LOCAL LOGIN - updating baseUserId`)
            setBaseUserId(newUserId)  // 自分で操作したので更新OK
            set({ user: newUser })
            broadcastAuthChange(newUserId, 'local-switch')
            clearAuthActionFlag()
            console.warn(`[AUTH_SWITCH][${tabId}] skip alert (local action)`)
            return
          }

          // 🚨 非操作タブ
          // baseUserId は触らない（これが核心）
          // Zustand stateは更新（表示用）
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'cross-tab-switch')

          // 非認証ページなら警告
          if (!isAuthPage) {
            console.error(`[AUTH_SWITCH][${tabId}] 🚨 ALERT - cross-tab switch on non-auth page`)
            showAlertAndReload()
          } else {
            console.warn(`[AUTH_SWITCH][${tabId}] on auth page - skip alert`)
          }
        }
      })

      console.warn(`[AUTH_INIT][${tabId}] onAuthStateChange listener setup complete`)
    } catch (error) {
      logger.error(`[AUTH_INIT][${tabId}]`, error)
      globalInitialized = true
      set({ user: null, isInitialized: true, authReady: true })
    } finally {
      globalInitializing = false
      set({ isLoading: false, isInitializing: false })
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true })
      const currentUser = get().user
      logger.debug(`[AUTH][${tabId}] signOut`)
      clearAllUserStorage(currentUser?.id)
      clearBaseUserId()  // logout時のみクリア
      await authService.signOut()
      set({ user: null })
    } catch (error) {
      logger.error(`[AUTH][${tabId}] signOut`, error)
    } finally {
      set({ isLoading: false })
    }
  },
}))

export const useAuth = () => {
  const { user, isLoading, isInitialized, authReady, signOut } = useAuthStore()
  return {
    user,
    isLoading,
    isInitialized,
    authReady,
    isAuthenticated: !!user,
    logout: signOut,
  }
}
