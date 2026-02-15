import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// =====================================================
// 🆕 タブ識別ID（sessionStorage ベース）
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
// 🚨 lastKnownUserId: broadcast 前に保存していた userId
// Supabase session は broadcast より先に書き換わるため、
// 現在 user を使うと必ず same user になる。
// 唯一信頼できるのは broadcast 前に保存していた userId。
// =====================================================
let lastKnownUserId: string | null = null

function setLastKnownUserId(userId: string | null) {
  lastKnownUserId = userId
  console.warn(`[AUTH][${tabId}] lastKnownUserId set:`, userId?.slice(0, 8) || 'null')
}

function getLastKnownUserId(): string | null {
  return lastKnownUserId
}

// =====================================================
// 🚨 ループ防止ガード
// =====================================================
let hasShownAlert = false
let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 3000

// =====================================================
// AuthPage マウントフラグ（onAuthStateChange 用）
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
// 🚨 showAlertAndReload: 単独関数
// =====================================================
function showAlertAndReload(reason: string, incomingUserId: string, lastKnown: string) {
  if (typeof window === 'undefined') return

  const now = Date.now()
  if (hasShownAlert || (now - lastAlertAt) < ALERT_COOLDOWN_MS) {
    console.warn(`[CROSS_TAB][${tabId}] alert cooldown - skipping`)
    return
  }

  hasShownAlert = true
  lastAlertAt = now

  console.warn(`[CROSS_TAB][${tabId}] FORCE ALERT`, {
    reason,
    incoming: incomingUserId.slice(0, 8),
    lastKnown: lastKnown.slice(0, 8)
  })

  clearAllUserStorage(lastKnown)

  window.alert('アカウントが切り替わりました。\nページを再読み込みします。')

  window.location.href = window.location.pathname + '?_ts=' + now
}

// =====================================================
// 🚨 handleIncomingAuthSwitch: lastKnownUserId ベース
// Supabase session は使わない！
// =====================================================
const handleIncomingAuthSwitch = (payload: any) => {
  if (!payload) return
  if (typeof window === 'undefined') return

  const incomingUserId = payload.userId
  const fromTab = payload.fromTab

  // 🚨 lastKnownUserId を取得（broadcast 前に保存していた userId）
  const lastKnown = getLastKnownUserId()

  console.warn(`[CROSS_TAB][${tabId}] message received:`, {
    incoming: incomingUserId?.slice(0, 8) || 'null',
    fromTab,
    myTabId: tabId,
    lastKnown: lastKnown?.slice(0, 8) || 'null'
  })

  // 自分自身からの通知は無視
  if (fromTab === tabId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (from self)`)
    return
  }

  // incoming が null/undefined/'null' の場合はスキップ
  if (!incomingUserId || incomingUserId === 'null') {
    console.warn(`[CROSS_TAB][${tabId}] ignored (incoming is null)`)
    return
  }

  // lastKnown がない場合はスキップ（未ログイン状態）
  if (!lastKnown) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (no lastKnownUserId)`)
    return
  }

  // 🚨 比較ログ
  console.warn(`[CROSS_TAB][${tabId}] comparing:`, {
    incoming: incomingUserId,
    lastKnown: lastKnown
  })

  // 🚨 判定: incoming !== lastKnown なら即 alert
  if (incomingUserId !== lastKnown) {
    console.warn(`[CROSS_TAB][${tabId}] USER MISMATCH DETECTED!`)
    showAlertAndReload('cross-tab user mismatch', incomingUserId, lastKnown)
  } else {
    console.warn(`[CROSS_TAB][${tabId}] same user - no action needed`)
  }
}

// =====================================================
// 🚨 MODULE TOP-LEVEL: BroadcastChannel + storage listener 即時初期化
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

  console.warn(`[BROADCAST][${tabId}] preparing to send:`, {
    userId: userId?.slice(0, 8) || 'null',
    source
  })

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
// isAuthPageCheck（onAuthStateChange 用）
// =====================================================
const isAuthPageCheck = (): boolean => {
  const windowPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const pathMatchesAuthPage = /^\/(login|signup)(\/|$)/.test(windowPath) ||
                               /^\/(login|signup)(\/|$)/.test(currentPath)
  return isAuthPageMounted && pathMatchesAuthPage
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

      // 🚨 初回ログイン時に lastKnownUserId を保存
      if (user?.id) {
        setLastKnownUserId(user.id)
      }

      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      logger.debug(`[AUTH_INIT][${tabId}] ready`, { hasUser: !!user })

      // =====================================================
      // onAuthStateChange
      // =====================================================
      authService.onAuthStateChange((newUser) => {
        // 🚨 BEFORE: 現在の lastKnownUserId を取得
        const prevUserId = getLastKnownUserId()
        const newUserId = newUser?.id

        console.warn(`[AUTH_SWITCH][${tabId}] onAuthStateChange:`, {
          prev: prevUserId?.slice(0, 8) || 'none',
          next: newUserId?.slice(0, 8) || 'none'
        })

        // 同一ユーザー
        if (prevUserId === newUserId) {
          return
        }

        // null → user（初回ログイン）
        if (!prevUserId && newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] initial login`)
          setLastKnownUserId(newUserId)
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'onAuthStateChange-initial')
          return
        }

        // user → null（ログアウト）
        if (prevUserId && !newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] logout`)
          setLastKnownUserId(null)
          set({ user: null })
          broadcastAuthChange(null, 'onAuthStateChange-logout')
          return
        }

        // user → different user（ユーザー切替）
        if (prevUserId && newUserId && prevUserId !== newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] USER SWITCH!`, {
            prev: prevUserId,
            next: newUserId
          })

          // broadcast（他タブに通知）- 新しい userId を送る
          broadcastAuthChange(newUserId, 'onAuthStateChange-switch')

          // 🚨 lastKnownUserId を更新（broadcast 後）
          setLastKnownUserId(newUserId)

          // 自分自身も警告（login/signup ページ以外）
          if (!isAuthPageCheck()) {
            set({ user: newUser })
            showAlertAndReload('onAuthStateChange switch', newUserId, prevUserId)
          } else {
            set({ user: newUser })
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
      setLastKnownUserId(null)
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
