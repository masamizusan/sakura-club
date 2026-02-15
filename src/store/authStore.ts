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
// =====================================================
function isAuthPageNow(): boolean {
  const windowPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const pathMatches = /^\/(login|signup)(\/|$)/.test(windowPath) ||
                      /^\/(login|signup)(\/|$)/.test(currentPath)
  return isAuthPageMounted || pathMatches
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
// handleIncomingAuthSwitch: cross-tab 受信処理
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
      // onAuthStateChange
      // =====================================================
      authService.onAuthStateChange((newUser) => {
        const prevUserId = lastKnownUserId
        const newUserId = newUser?.id
        const isAuthPage = isAuthPageNow()

        console.warn(`[AUTH_SWITCH][${tabId}] onAuthStateChange:`, {
          prev: prevUserId?.slice(0, 8) || 'none',
          next: newUserId?.slice(0, 8) || 'none',
          isAuthPage
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
          console.warn(`[AUTH_SWITCH][${tabId}] USER SWITCH!`, {
            prev: prevUserId,
            next: newUserId,
            isAuthPage
          })

          // 🚨 ログインページ（操作タブ）の場合:
          // - lastKnownUserId を新ユーザーに更新（自分で切り替えたので）
          // - broadcast を送る
          // - 警告は出さない
          if (isAuthPage) {
            lastKnownUserId = newUserId
            console.warn(`[AUTH][${tabId}] lastKnownUserId updated by local login:`, lastKnownUserId.slice(0, 8))
            set({ user: newUser })
            broadcastAuthChange(newUserId, 'onAuthStateChange-switch')
            console.warn(`[AUTH_SWITCH][${tabId}] on auth page - skip alert`)
            return
          }

          // 🚨 非ログインページ（受け身タブ）の場合:
          // - lastKnownUserId は更新しない
          // - broadcast を送る
          // - 警告を出す
          broadcastAuthChange(newUserId, 'onAuthStateChange-switch')
          set({ user: newUser })
          showAlertAndReload()
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
