import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// =====================================================
// 🚨 Cross-Tab認証検知 - sessionStorageベース
//
// 原則: Supabase/Zustand/グローバル変数は判定に使用禁止
// sessionStorageの base/pending/tabId/auth_action のみを使用
// =====================================================

// =====================================================
// 1️⃣ タブ固有ID
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
// 2️⃣ 基準ユーザーID（__base_user_id__）
// =====================================================
const BASE_USER_KEY = '__base_user_id__'

function getBaseUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(BASE_USER_KEY)
}

function setBaseUserId(userId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(BASE_USER_KEY, userId)
  console.warn(`[BASE_USER][${tabId}] set:`, userId.slice(0, 8))
}

function clearBaseUserId() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(BASE_USER_KEY)
  console.warn(`[BASE_USER][${tabId}] cleared`)
}

// =====================================================
// 3️⃣ ペンディングユーザーID（__pending_user_id__）
// リロード後にbaseを更新するための橋渡し
// =====================================================
const PENDING_USER_KEY = '__pending_user_id__'

function getPendingUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PENDING_USER_KEY)
}

function setPendingUserId(userId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_USER_KEY, userId)
  console.warn(`[PENDING][${tabId}] set:`, userId.slice(0, 8))
}

function clearPendingUserId() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PENDING_USER_KEY)
  console.warn(`[PENDING][${tabId}] cleared`)
}

// =====================================================
// 4️⃣ リロードガード（__reload_guard__）
// 無限リロード防止：8秒以内は再実行しない
// =====================================================
const RELOAD_GUARD_KEY = '__reload_guard__'
const RELOAD_GUARD_MS = 8000

function setReloadGuard() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(RELOAD_GUARD_KEY, Date.now().toString())
  console.warn(`[GUARD][${tabId}] set`)
}

function isReloadGuardActive(): boolean {
  if (typeof window === 'undefined') return false
  const guardTime = sessionStorage.getItem(RELOAD_GUARD_KEY)
  if (!guardTime) return false
  const elapsed = Date.now() - parseInt(guardTime, 10)
  return elapsed < RELOAD_GUARD_MS
}

function clearReloadGuard() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(RELOAD_GUARD_KEY)
  console.warn(`[GUARD][${tabId}] cleared`)
}

// =====================================================
// 5️⃣ 認証操作フラグ（__auth_action__）
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

function isAuthActionInThisTab(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(AUTH_ACTION_KEY) === '1'
}

// Export for login/signup pages
export { setAuthActionFlag as setAuthActionInThisTab, clearAuthActionFlag as clearAuthActionInThisTab }

// =====================================================
// 6️⃣ isAuthPageNow() - pathnameのみ（共有状態は完全禁止）
// =====================================================
function isAuthPageNow(): boolean {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  const isAuth = path === '/login' || path === '/signup' ||
                 path.startsWith('/login/') || path.startsWith('/signup/') ||
                 path.startsWith('/auth/')
  console.warn(`[ROUTE][${tabId}] isAuthPageNow=${isAuth} path=${path}`)
  return isAuth
}

// =====================================================
// タブ間通信
// =====================================================
const AUTH_CHANNEL_NAME = 'auth-switch'
const CROSS_TAB_AUTH_KEY = '__auth_switch__'

// =====================================================
// showAlertAndReload - 1回だけ実行
// =====================================================
function showAlertAndReload(incomingUserId: string) {
  if (typeof window === 'undefined') return

  // ガードチェック
  if (isReloadGuardActive()) {
    console.warn(`[GUARD][${tabId}] active -> skip reload`)
    return
  }

  // pending保存 → ガード設定 → alert → reload
  setPendingUserId(incomingUserId)
  setReloadGuard()

  console.error(`[CROSS_TAB][${tabId}] USER MISMATCH -> pending=${incomingUserId.slice(0, 8)} alert+reload`)

  window.alert('別タブでログインが行われました。再読み込みします。')
  window.location.reload()
}

// =====================================================
// 受信ハンドラ
// =====================================================
function handleIncomingAuthSwitch(payload: any) {
  if (!payload) return
  if (typeof window === 'undefined') return

  const incomingUserId = payload.userId
  const fromTab = payload.fromTab
  const baseUserId = getBaseUserId()
  const isAuthPage = isAuthPageNow()
  const isLocalAction = isAuthActionInThisTab()
  const guardActive = isReloadGuardActive()

  console.warn(`[CROSS_TAB][${tabId}] comparing:`, {
    incoming: incomingUserId?.slice(0, 8) || 'null',
    base: baseUserId?.slice(0, 8) || 'null',
    fromTab: fromTab?.slice(0, 6) || 'null',
    myTabId: tabId,
    path: window.location.pathname,
    isAuthPage,
    isLocalAction,
    guardActive
  })

  // 自タブからのbroadcastは無視
  if (fromTab === tabId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (from self)`)
    return
  }

  // 認証ページでは警告しない
  if (isAuthPage) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (on auth page)`)
    return
  }

  // 操作タブは無視
  if (isLocalAction) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (local action)`)
    return
  }

  // baseUserIdがなければ無視（未ログイン状態）
  if (!baseUserId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (no baseUserId)`)
    return
  }

  // ガードが有効なら無視
  if (guardActive) {
    console.warn(`[GUARD][${tabId}] active -> skip reload`)
    return
  }

  // 🚨 核心判定: incoming !== base なら alert + reload
  if (incomingUserId && incomingUserId !== baseUserId) {
    showAlertAndReload(incomingUserId)
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
// 🚨 BOOT処理: pending反映（最重要）
// リロード後にbaseを更新してループを止める
// =====================================================
function applyPendingUserOnBoot() {
  if (typeof window === 'undefined') return

  const pending = getPendingUserId()
  const base = getBaseUserId()

  console.warn(`[BOOT][${tabId}] base=${base?.slice(0, 8) || 'null'} pending=${pending?.slice(0, 8) || 'null'}`)

  if (pending) {
    // pending を base に反映
    setBaseUserId(pending)
    clearPendingUserId()
    clearAuthActionFlag()
    clearReloadGuard()
    console.warn(`[BOOT][${tabId}] applied pending -> base updated: ${pending.slice(0, 8)}`)
  }
}

// モジュール読み込み時に即実行（リロード直後に実行される）
if (typeof window !== 'undefined') {
  applyPendingUserOnBoot()
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

      // 初回ログイン時のみ baseUserId を設定（pendingがない場合）
      if (user?.id && !getBaseUserId()) {
        setBaseUserId(user.id)
      }

      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      logger.debug(`[AUTH_INIT][${tabId}] ready`, { hasUser: !!user })

      // =====================================================
      // onAuthStateChange 処理
      // =====================================================
      authService.onAuthStateChange((newUser) => {
        const newUserId = newUser?.id || null
        const baseUserId = getBaseUserId()
        const isAuthPage = isAuthPageNow()
        const hasActionFlag = isAuthActionInThisTab()

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
            setBaseUserId(newUserId)
            set({ user: newUser })
            broadcastAuthChange(newUserId, 'local-switch')
            clearAuthActionFlag()
            console.warn(`[AUTH_SWITCH][${tabId}] skip alert (local action)`)
            return
          }

          // 🚨 非操作タブ - Zustand stateは更新（表示用）
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'cross-tab-switch')

          // 非認証ページなら警告（ただしガードが有効でない場合のみ）
          if (!isAuthPage && !isReloadGuardActive()) {
            showAlertAndReload(newUserId)
          } else if (isAuthPage) {
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
      clearBaseUserId()
      clearPendingUserId()
      clearReloadGuard()
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
