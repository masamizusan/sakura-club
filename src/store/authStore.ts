import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// 🆕 タブ識別ID（sessionStorage ベース）
// 各タブで固有のIDを保証する
// - localStorage ❌（全タブで共有される）
// - module static ❌（ビルド時に固定される可能性）
// - sessionStorage ✅（タブごとに独立）
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
// 🚨 ループ防止ガード
// 同一タブ内で警告→リロードが1回だけ実行されるようにする
// =====================================================
let hasShownAlert = false
let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 3000

// =====================================================
// 🆕 AuthPage マウントフラグ（onAuthStateChange 用）
// =====================================================
let isAuthPageMounted = false

export function setAuthPageMounted(mounted: boolean) {
  isAuthPageMounted = mounted
  console.warn(`[AUTH_PAGE][${tabId}] mounted:`, mounted)
}

// 現在パス保持（onAuthStateChange 用）
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
// cross-tab 検出時に即座に呼ぶ
// =====================================================
function showAlertAndReload(reason: string, incomingUserId: string, localUserId: string) {
  if (typeof window === 'undefined') return

  // ループ防止
  const now = Date.now()
  if (hasShownAlert || (now - lastAlertAt) < ALERT_COOLDOWN_MS) {
    console.warn(`[CROSS_TAB][${tabId}] alert cooldown - skipping`, { reason })
    return
  }

  hasShownAlert = true
  lastAlertAt = now

  console.warn(`[CROSS_TAB][${tabId}] FORCE ALERT`, {
    reason,
    incoming: incomingUserId.slice(0, 8),
    local: localUserId.slice(0, 8)
  })

  // ストレージクリア
  clearAllUserStorage(localUserId)

  // 警告表示
  window.alert('アカウントが切り替わりました。\nページを再読み込みします。')

  // リロード
  const targetUrl = window.location.pathname + '?_ts=' + now
  window.location.href = targetUrl
}

// =====================================================
// 🚨 handleIncomingAuthSwitch: 状態非依存版
// Zustand を信用せず、Supabase から直接ユーザーIDを取得
// =====================================================
const handleIncomingAuthSwitch = async (payload: any) => {
  if (!payload) return
  if (typeof window === 'undefined') return

  const incomingUserId = payload.userId
  const fromTab = payload.fromTab

  // 🚨 ログ: 受信内容
  console.warn(`[CROSS_TAB][${tabId}] message received:`, {
    incoming: incomingUserId,
    fromTab,
    myTabId: tabId
  })

  // 自分自身からの通知は無視（これだけは維持）
  if (fromTab === tabId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (from self)`)
    return
  }

  // incoming が null/undefined/'null' の場合はスキップ
  if (!incomingUserId || incomingUserId === 'null') {
    console.warn(`[CROSS_TAB][${tabId}] ignored (incoming is null)`)
    return
  }

  // 🚨 Supabase から直接現在のユーザーIDを取得
  // Zustand の state を信用しない！
  let localUserId: string | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    localUserId = user?.id || null
  } catch (e) {
    console.warn(`[CROSS_TAB][${tabId}] failed to get supabase user:`, e)
  }

  // 🚨 ログ: 比較対象
  console.warn(`[CROSS_TAB][${tabId}] comparing:`, {
    incoming: incomingUserId?.slice(0, 8),
    local: localUserId?.slice(0, 8) || 'none'
  })

  // ローカルユーザーがいない場合はスキップ（未ログイン状態）
  if (!localUserId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored (no local user)`)
    return
  }

  // 🚨 判定: incoming !== local なら即 alert
  if (incomingUserId !== localUserId) {
    console.warn(`[CROSS_TAB][${tabId}] USER MISMATCH DETECTED!`, {
      incoming: incomingUserId,
      local: localUserId
    })
    showAlertAndReload('cross-tab user mismatch', incomingUserId, localUserId)
  } else {
    console.warn(`[CROSS_TAB][${tabId}] same user - no action needed`)
  }
}

// =====================================================
// 🚨 MODULE TOP-LEVEL: BroadcastChannel + storage listener 即時初期化
// React mount を待たない！Zustand create() の中でやらない！
// =====================================================
let authChannel: BroadcastChannel | null = null

if (typeof window !== 'undefined') {
  // BroadcastChannel 即時初期化
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

  // localStorage storage イベント即時初期化
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
// 🚨 broadcastAuthChange: 必ず全タブに通知する
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

  // BroadcastChannel で送信
  if (authChannel) {
    try {
      authChannel.postMessage(payload)
      console.warn(`[BROADCAST][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)
    } catch (e) {
      console.warn(`[BROADCAST][${tabId}] send failed:`, e)
    }
  }

  // localStorage フォールバック
  try {
    localStorage.setItem(CROSS_TAB_AUTH_KEY, JSON.stringify(payload))
    console.warn(`[STORAGE][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)
  } catch (e) {
    console.warn(`[STORAGE][${tabId}] send failed:`, e)
  }
}

// 外部から呼び出し可能なエクスポート
export const notifyAuthChange = (userId: string | null) => {
  broadcastAuthChange(userId, 'explicit')
}

// =====================================================
// 🚨 isAuthPageCheck（onAuthStateChange 用）
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

      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      logger.debug(`[AUTH_INIT][${tabId}] ready`, { hasUser: !!user })

      // =====================================================
      // onAuthStateChange（同一タブ内のユーザー切替検出 + broadcast）
      // =====================================================
      authService.onAuthStateChange((newUser) => {
        const currentState = get()
        const prevUserId = currentState.user?.id
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
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'onAuthStateChange-initial')
          return
        }

        // user → null（ログアウト）
        if (prevUserId && !newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] logout`)
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

          // broadcast（他タブに通知）
          broadcastAuthChange(newUserId, 'onAuthStateChange-switch')

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
      await authService.signOut()
      set({ user: null })
    } catch (error) {
      logger.error(`[AUTH][${tabId}] signOut`, error)
    } finally {
      set({ isLoading: false })
    }
  },
}))

// Hook for easy access
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
