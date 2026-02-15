import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// =====================================================
// タブ識別ID（sessionStorage ベース）
// =====================================================
const TAB_ID_KEY = '__sakura_tab_id__'

function getTabId(): string {
  if (typeof window === 'undefined') return 'server'

  let id = sessionStorage.getItem(TAB_ID_KEY)
  if (!id) {
    id = Math.random().toString(36).substring(2, 8)
    sessionStorage.setItem(TAB_ID_KEY, id)
  }
  return id
}

const tabId = getTabId()

// =====================================================
// lastKnownUserId: タブ基準の期待値
//
// ルール:
// - 初回ログイン時: 未設定なら現在ユーザーでセット
// - ログアウト時: null にリセット
// - ログイン操作をしたタブ: ログイン成功確定時に更新OK
// - 受け身側タブ: cross-tab 通知受信時は更新しない（先に警告→リロード）
// =====================================================
let lastKnownUserId: string | null = null

// =====================================================
// ループ防止ガード
// =====================================================
let hasShownAlert = false
let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 3000

// =====================================================
// AuthPage マウントフラグ
// =====================================================
let isAuthPageMounted = false

export function setAuthPageMounted(mounted: boolean) {
  isAuthPageMounted = mounted
  console.warn(`[AUTH_PAGE][${tabId}] mounted:`, mounted)
}

let currentPath = ''

export function setCurrentPath(path: string) {
  currentPath = path
  console.warn(`[AUTH_PATH][${tabId}] stored:`, path)
}

// =====================================================
// タブ間通信用定数
// =====================================================
const AUTH_CHANNEL_NAME = 'auth-switch'
const CROSS_TAB_AUTH_KEY = '__auth_switch__'

// =====================================================
// isAuthPageNow: 現在ログイン/サインアップページか
// 🚨 CRITICAL: window.location.pathname のみを使用
// isAuthPageMounted は他タブの状態が混入するため使用禁止
// =====================================================
function isAuthPageNow(): boolean {
  if (typeof window === 'undefined') return false
  const windowPath = window.location.pathname
  return /^\/(login|signup)(\/|$)/.test(windowPath)
}

// =====================================================
// このタブでの認証操作フラグ
// =====================================================
const AUTH_ACTION_FLAG_KEY = '__auth_action_in_this_tab__'

function setAuthActionInThisTab() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(AUTH_ACTION_FLAG_KEY, '1')
    console.warn(`[AUTH_FLAG][${tabId}] set auth action flag`)
  }
}

function clearAuthActionInThisTab() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(AUTH_ACTION_FLAG_KEY)
    console.warn(`[AUTH_FLAG][${tabId}] cleared auth action flag`)
  }
}

function isAuthActionInThisTab(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(AUTH_ACTION_FLAG_KEY) === '1'
}

// =====================================================
// showAlertAndReload: 単独関数
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

  console.error(`[CROSS_TAB][${tabId}] FORCE ALERT - showing dialog`)

  window.alert('別タブでログインが行われました。再読み込みします。')

  window.location.reload()
}

// =====================================================
// handleIncomingAuthSwitch: cross-tab 受信処理（補助機能）
//
// 🚨 NOTE: Tab自己判定方式が主な検出手段
// この関数は onAuthStateChange が発火しないエッジケースのフォールバック
//
// 警告条件:
// 1. fromTab !== tabId（自タブ起点は無視）
// 2. !isAuthPageNow()（/login, /signup は除外）
// 3. lastKnownUserId が存在
// 4. incoming !== lastKnown
// =====================================================
const handleIncomingAuthSwitch = (payload: any) => {
  if (!payload) return
  if (typeof window === 'undefined') return

  const incomingUserId = payload.userId
  const fromTab = payload.fromTab
  const isAuthPage = isAuthPageNow()

  // 🚨 詳細ログ
  console.warn(`[CROSS_TAB][${tabId}] comparing:`, {
    incoming: incomingUserId?.slice(0, 8) || 'null',
    lastKnown: lastKnownUserId?.slice(0, 8) || 'null',
    fromTab: fromTab?.slice(0, 6) || 'null',
    myTabId: tabId,
    isAuthPage
  })

  // 自タブ起点は常に無視
  if (fromTab === tabId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (from self)`)
    return
  }

  // /login, /signup ページでは警告しない
  if (isAuthPage) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (on auth page)`)
    return
  }

  // lastKnown がなければ無視（未ログイン状態）
  if (!lastKnownUserId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (no lastKnownUserId)`)
    return
  }

  // 🚨 判定: incoming !== lastKnown なら即 alert
  if (incomingUserId && incomingUserId !== lastKnownUserId) {
    console.error(`[CROSS_TAB][${tabId}] USER MISMATCH DETECTED!`, {
      incoming: incomingUserId,
      lastKnown: lastKnownUserId
    })
    showAlertAndReload()
  }
}

// =====================================================
// MODULE TOP-LEVEL: BroadcastChannel + storage listener 即時初期化
// =====================================================
let authChannel: BroadcastChannel | null = null

if (typeof window !== 'undefined') {
  try {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    authChannel.onmessage = (event) => {
      const payload = event.data || {}
      if (payload.userId !== undefined) {
        console.warn(`[BROADCAST][${tabId}] received:`, payload)
        handleIncomingAuthSwitch(payload)
      }
    }
    console.warn(`[AUTH_LISTENER][${tabId}] BroadcastChannel READY`)
  } catch (e) {
    console.warn(`[AUTH_LISTENER][${tabId}] BroadcastChannel not supported:`, e)
    authChannel = null
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== CROSS_TAB_AUTH_KEY || !event.newValue) return

    try {
      const payload = JSON.parse(event.newValue)
      console.warn(`[STORAGE][${tabId}] event received:`, payload)
      handleIncomingAuthSwitch(payload)
    } catch (e) {
      console.warn(`[STORAGE][${tabId}] parse error:`, e)
    }
  })
  console.warn(`[AUTH_LISTENER][${tabId}] storage READY`)
}

// =====================================================
// broadcastAuthChange
// =====================================================
const broadcastAuthChange = (userId: string | null, source: string) => {
  if (typeof window === 'undefined') return

  const payload = {
    userId,
    at: Date.now(),
    nonce: Math.random().toString(36).substring(2, 10),
    fromTab: tabId,
    source
  }

  if (authChannel) {
    try {
      authChannel.postMessage(payload)
      console.warn(`[BROADCAST][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)
    } catch (e) {
      console.warn(`[BROADCAST][${tabId}] send failed:`, e)
    }
  }

  try {
    localStorage.setItem(CROSS_TAB_AUTH_KEY, JSON.stringify(payload))
    console.warn(`[STORAGE][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)
  } catch (e) {
    console.warn(`[STORAGE][${tabId}] send failed:`, e)
  }
}

export const notifyAuthChange = (userId: string | null) => {
  broadcastAuthChange(userId, 'explicit')
}

// Export for login/signup pages
export { setAuthActionInThisTab, clearAuthActionInThisTab }

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

      // 初回ログイン時のみ lastKnownUserId を保存
      if (user?.id && !lastKnownUserId) {
        lastKnownUserId = user.id
        console.warn(`[AUTH][${tabId}] lastKnownUserId set:`, lastKnownUserId.slice(0, 8))
      }

      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      logger.debug(`[AUTH_INIT][${tabId}] ready`, { hasUser: !!user })

      // =====================================================
      // onAuthStateChange - Tab自己判定方式
      // 🚨 CRITICAL: このタブ自身のonAuthStateChangeでユーザー切替を検出
      // Cross-tab通知は補助的な役割のみ
      // =====================================================
      authService.onAuthStateChange((newUser) => {
        const prevUserId = lastKnownUserId
        const newUserId = newUser?.id
        const isAuthPage = isAuthPageNow()
        const isLocalAction = isAuthActionInThisTab()

        console.warn(`[AUTH_SWITCH][${tabId}] onAuthStateChange:`, {
          prev: prevUserId?.slice(0, 8) || 'none',
          next: newUserId?.slice(0, 8) || 'none',
          isAuthPage,
          isLocalAction,
          path: typeof window !== 'undefined' ? window.location.pathname : 'server'
        })

        // 同一ユーザー
        if (prevUserId === newUserId) {
          return
        }

        // null → user（初回ログイン）
        if (!prevUserId && newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] initial login`)
          if (!lastKnownUserId) {
            lastKnownUserId = newUserId
            console.warn(`[AUTH][${tabId}] lastKnownUserId set:`, lastKnownUserId.slice(0, 8))
          }
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'onAuthStateChange-initial')
          // 初回ログイン後にフラグをクリア
          clearAuthActionInThisTab()
          return
        }

        // user → null（ログアウト）
        if (prevUserId && !newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] logout`)
          lastKnownUserId = null
          set({ user: null })
          broadcastAuthChange(null, 'onAuthStateChange-logout')
          return
        }

        // user → different user（ユーザー切替）
        if (prevUserId && newUserId && prevUserId !== newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] USER SWITCH DETECTED!`, {
            prev: prevUserId.slice(0, 8),
            next: newUserId.slice(0, 8),
            isAuthPage,
            isLocalAction
          })

          // 🚨 このタブが認証操作を行った場合（ログインページ + フラグあり）:
          // - lastKnownUserId を新ユーザーに更新
          // - broadcast を送る（他タブへ通知）
          // - 警告は出さない
          // - フラグをクリア
          if (isAuthPage && isLocalAction) {
            lastKnownUserId = newUserId
            console.warn(`[AUTH][${tabId}] LOCAL LOGIN - lastKnownUserId updated:`, lastKnownUserId.slice(0, 8))
            set({ user: newUser })
            broadcastAuthChange(newUserId, 'onAuthStateChange-local-login')
            clearAuthActionInThisTab()
            console.warn(`[AUTH_SWITCH][${tabId}] local auth action - skip alert`)
            return
          }

          // 🚨 このタブが認証操作を行っていない場合（他タブでのログイン）:
          // - lastKnownUserId は更新しない
          // - broadcast を送る
          // - 🎯 非認証ページなら警告を出す
          console.warn(`[AUTH_SWITCH][${tabId}] CROSS-TAB SWITCH - checking alert condition`, {
            isAuthPage,
            shouldAlert: !isAuthPage
          })

          broadcastAuthChange(newUserId, 'onAuthStateChange-cross-tab-switch')
          set({ user: newUser })

          // 非認証ページでユーザーが切り替わった = 他タブでログインされた
          if (!isAuthPage) {
            console.error(`[AUTH_SWITCH][${tabId}] 🚨 ALERT TRIGGERED - cross-tab user switch on non-auth page`)
            showAlertAndReload()
          } else {
            // 認証ページだがフラグがない = 他タブのログインがリフレッシュで反映
            console.warn(`[AUTH_SWITCH][${tabId}] on auth page without local flag - skip alert`)
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
      lastKnownUserId = null
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
