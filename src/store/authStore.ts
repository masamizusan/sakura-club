import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// =====================================================
// 🚨 Cross-Tab認証検知 - sessionStorageベース
//
// 原則:
// - Supabase/Zustand/グローバル変数は判定に使用禁止
// - 判定の唯一の基準は sessionStorage の __base_user_id__
// - onAuthStateChange は broadcast 送信専用
// - alert/reload は broadcast 受信ハンドラでのみ実行
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
// 更新していいのは2ケースだけ:
// (a) 操作タブ（auth page + auth action）でのログイン成功時
// (b) boot時の pending → base 反映
// =====================================================
const BASE_USER_KEY = '__base_user_id__'

function getBaseUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(BASE_USER_KEY)
}

// 初回のみセット（上書き禁止）
function setBaseUserIdOnce(userId: string) {
  if (typeof window === 'undefined') return
  if (getBaseUserId()) {
    console.warn(`[BASE_USER][${tabId}] already set, skip`)
    return
  }
  sessionStorage.setItem(BASE_USER_KEY, userId)
  console.warn(`[BASE_USER][${tabId}] set (once): ${userId.slice(0, 8)}`)
}

// 操作タブでのログイン成功時のみ呼ぶ
function updateBaseUserId(userId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(BASE_USER_KEY, userId)
  console.warn(`[BASE_USER][${tabId}] updated: ${userId.slice(0, 8)}`)
}

function clearBaseUserId() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(BASE_USER_KEY)
  console.warn(`[BASE_USER][${tabId}] cleared`)
}

// =====================================================
// 3️⃣ ペンディングユーザーID（__pending_user_id__）
// 受け身タブでのみセット（操作タブでは絶対にセットしない）
// =====================================================
const PENDING_USER_KEY = '__pending_user_id__'

function getPendingUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PENDING_USER_KEY)
}

function setPendingUserId(userId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_USER_KEY, userId)
  console.warn(`[PENDING][${tabId}] set: ${userId.slice(0, 8)}`)
}

function clearPendingUserId() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PENDING_USER_KEY)
  console.warn(`[PENDING][${tabId}] cleared`)
}

// =====================================================
// 4️⃣ リロードガード（__reload_guard__）
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
  const active = elapsed < RELOAD_GUARD_MS
  if (active) {
    console.warn(`[GUARD][${tabId}] active (${elapsed}ms elapsed)`)
  }
  return active
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
  return isAuth
}

// =====================================================
// タブ間通信
// =====================================================
const AUTH_CHANNEL_NAME = 'auth-switch'
const CROSS_TAB_AUTH_KEY = '__auth_switch__'

// =====================================================
// 🚨 受信ハンドラ（唯一の判定ロジック）
// ここでのみ alert/reload を実行
// =====================================================
function handleIncomingAuthSwitch(payload: any) {
  if (!payload) return
  if (typeof window === 'undefined') return

  const incomingUserId = payload.userId
  const fromTab = payload.fromTab
  const baseUserId = getBaseUserId()
  const path = window.location.pathname
  const isAuthPage = isAuthPageNow()

  // 🚨 CRITICAL: auth_action フラグは認証ページでのみ有効
  // 認証ページでない場合は古いフラグが残っている可能性があるのでクリアして無視
  let isLocalAction = isAuthActionInThisTab()
  if (isLocalAction && !isAuthPage) {
    console.warn(`[CROSS_TAB][${tabId}] stale auth_action flag on non-auth page - clearing`)
    clearAuthActionFlag()
    isLocalAction = false
  }

  const guardActive = isReloadGuardActive()

  console.warn(`[CROSS_TAB][${tabId}] received`, {
    from: fromTab?.slice(0, 6) || 'null',
    incoming: incomingUserId?.slice(0, 8) || 'null',
    path,
    authPage: isAuthPage,
    localAction: isLocalAction,
    base: baseUserId?.slice(0, 8) || 'null'
  })

  // 自タブからのbroadcastは無視
  if (fromTab === tabId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored self`)
    return
  }

  // 認証ページでは警告しない（操作タブを誤爆させない）
  if (isAuthPage) {
    console.warn(`[CROSS_TAB][${tabId}] ignored auth page`)
    return
  }

  // 操作タブは無視（ただし上記で非認証ページの古いフラグはクリア済み）
  if (isLocalAction) {
    console.warn(`[CROSS_TAB][${tabId}] ignored local action`)
    return
  }

  // baseUserIdがなければ無視（初回ログイン前のタブは判定できない）
  if (!baseUserId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored no base`)
    return
  }

  // ガードが有効なら無視（ループ防止）
  if (guardActive) {
    console.warn(`[GUARD][${tabId}] skip reload (guard active)`)
    return
  }

  // 🚨 核心判定: incoming !== base なら mismatch
  if (incomingUserId && incomingUserId !== baseUserId) {
    console.error(`[CROSS_TAB][${tabId}] mismatch -> set pending + alert + reload`, {
      incoming: incomingUserId.slice(0, 8),
      base: baseUserId.slice(0, 8)
    })

    // pending保存 → guard設定 → alert → reload
    setPendingUserId(incomingUserId)
    setReloadGuard()

    window.alert('別タブでログインが行われました。再読み込みします。')
    window.location.reload()
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
      handleIncomingAuthSwitch(payload)
    } catch (e) {
      console.warn(`[STORAGE][${tabId}] parse error`)
    }
  })
  console.warn(`[AUTH_LISTENER][${tabId}] storage READY`)
}

// =====================================================
// broadcastAuthChange（送信専用）
// =====================================================
function broadcastAuthChange(userId: string | null, source: string) {
  if (typeof window === 'undefined') return

  const payload = {
    userId,
    fromTab: tabId,
    at: Date.now()
  }

  console.warn(`[BROADCAST][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)

  if (authChannel) {
    try {
      authChannel.postMessage(payload)
    } catch (e) {
      console.warn(`[BROADCAST][${tabId}] send failed`)
    }
  }

  try {
    localStorage.setItem(CROSS_TAB_AUTH_KEY, JSON.stringify(payload))
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
export function setAuthPageMounted(_mounted: boolean) {}
export function setCurrentPath(_path: string) {}

// =====================================================
// 🚨 BOOT処理: pending反映（最重要）
// リロード後にbaseを更新してループを止める
// =====================================================
function applyPendingUserOnBoot() {
  if (typeof window === 'undefined') return

  const pending = getPendingUserId()
  const base = getBaseUserId()
  const guardTime = sessionStorage.getItem(RELOAD_GUARD_KEY)
  const guardAge = guardTime ? Date.now() - parseInt(guardTime, 10) : null
  const isAuthPage = isAuthPageNow()
  const hasActionFlag = isAuthActionInThisTab()

  console.warn(`[BOOT][${tabId}] base=${base?.slice(0, 8) || 'null'} pending=${pending?.slice(0, 8) || 'null'} guard=${guardAge}ms path=${window.location.pathname} authPage=${isAuthPage} actionFlag=${hasActionFlag}`)

  // 🚨 CRITICAL: 認証ページでない場合、古い auth_action フラグをクリア
  if (hasActionFlag && !isAuthPage) {
    console.warn(`[BOOT][${tabId}] clearing stale auth_action flag on non-auth page`)
    clearAuthActionFlag()
  }

  if (pending) {
    // pending を base に反映（ループを止める）
    updateBaseUserId(pending)
    clearPendingUserId()
    clearAuthActionFlag()
    // guard は短時間残す（念のため）
    console.warn(`[BOOT][${tabId}] applied pending -> base updated: ${pending.slice(0, 8)}`)
  }
}

// モジュール読み込み時に即実行
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

      // 初回ログイン時のみ baseUserId を設定（上書きしない）
      if (user?.id) {
        setBaseUserIdOnce(user.id)
      }

      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      logger.debug(`[AUTH_INIT][${tabId}] ready`, { hasUser: !!user })

      // =====================================================
      // onAuthStateChange（送信専用）
      // 🚨 ここでは alert/reload を絶対に呼ばない
      // =====================================================
      authService.onAuthStateChange((newUser) => {
        const newUserId = newUser?.id || null
        const baseUserId = getBaseUserId()
        const path = typeof window !== 'undefined' ? window.location.pathname : 'server'
        const isAuthPage = isAuthPageNow()
        const hasActionFlag = isAuthActionInThisTab()

        console.warn(`[AUTH_SWITCH][${tabId}] onAuthStateChange`, {
          new: newUserId?.slice(0, 8) || 'none',
          base: baseUserId?.slice(0, 8) || 'none',
          path,
          authPage: isAuthPage,
          actionFlag: hasActionFlag
        })

        // null → user（初回ログイン）
        if (!baseUserId && newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] initial login`)
          setBaseUserIdOnce(newUserId)
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'initial')
          clearAuthActionFlag()
          return
        }

        // user → null（ログアウト）
        if (baseUserId && !newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] logout`)
          clearBaseUserId()
          clearPendingUserId()
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
          console.warn(`[AUTH_SWITCH][${tabId}] user switch detected`, {
            base: baseUserId.slice(0, 8),
            new: newUserId.slice(0, 8)
          })

          // 🚨 操作タブ（auth page + auth action）のみ base を更新
          if (isAuthPage && hasActionFlag) {
            console.warn(`[AUTH_SWITCH][${tabId}] LOCAL LOGIN - update base`)
            updateBaseUserId(newUserId)
            set({ user: newUser })
            broadcastAuthChange(newUserId, 'local-switch')
            clearAuthActionFlag()
            return
          }

          // 🚨 非操作タブ（受け身）
          // base は触らない（これが核心）
          // Zustand state のみ更新（表示用）
          // broadcast 送信のみ（alert/reload は受信ハンドラに任せる）
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'cross-tab-switch')
          console.warn(`[AUTH_SWITCH][${tabId}] passive tab - broadcast only (no alert here)`)
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
