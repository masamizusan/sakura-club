import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// =====================================================
// 🆕 タブ識別ID（デバッグ用）
// 各タブに一意のIDを付与してログで追跡可能にする
// =====================================================
const tabId = typeof window !== 'undefined'
  ? Math.random().toString(36).substring(2, 8)
  : 'ssr'

// グローバルな初期化フラグ
let globalInitialized = false
let globalInitializing = false

// =====================================================
// 🚨 ループ防止ガード
// 同一タブ内で警告→リロードが1回だけ実行されるようにする
// =====================================================
let hasHandledAuthSwitch = false
let lastHandledAt = 0
const AUTH_SWITCH_COOLDOWN_MS = 3000

// =====================================================
// 🆕 AuthPage マウントフラグ
// =====================================================
let isAuthPageMounted = false

export function setAuthPageMounted(mounted: boolean) {
  isAuthPageMounted = mounted
  console.warn(`[AUTH_PAGE][${tabId}] mounted:`, mounted)
}

// 現在パス保持（フェイルセーフ判定用）
let currentPath = ''

export function setCurrentPath(path: string) {
  currentPath = path
  console.warn(`[AUTH_PATH][${tabId}] stored:`, path)
}

// =====================================================
// タブ間通信用（BroadcastChannel + localStorage フォールバック）
// =====================================================
const AUTH_CHANNEL_NAME = 'auth-switch'
const CROSS_TAB_AUTH_KEY = '__auth_switch__'

let authChannel: BroadcastChannel | null = null

// BroadcastChannel の初期化
const initBroadcastChannel = (onMessage: (userId: string, payload: any) => void) => {
  if (typeof window === 'undefined') return

  try {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    authChannel.onmessage = (event) => {
      const payload = event.data || {}
      const { userId } = payload
      if (userId) {
        console.warn(`[BROADCAST][${tabId}] received:`, payload)
        onMessage(userId, payload)
      }
    }
    console.warn(`[AUTH_INIT][${tabId}] BroadcastChannel initialized`)
  } catch (e) {
    console.warn(`[AUTH_INIT][${tabId}] BroadcastChannel not supported`)
    authChannel = null
  }
}

// =====================================================
// 🚨 broadcastAuthChange: 必ず全タブに通知する
// login/signup だけでなく、onAuthStateChange からも呼ぶ
// =====================================================
const broadcastAuthChange = (userId: string | null, source: string) => {
  if (typeof window === 'undefined') return

  // 🚨 引数の確認ログ
  console.warn(`[BROADCAST][${tabId}] preparing to send:`, {
    userId_received: userId,
    userId_full: userId || 'null',
    source
  })

  // nonce を追加して必ず値が変化するようにする
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
      console.warn(`[BROADCAST][${tabId}][send] userId=${userId} source=${source}`)
    } catch (e) {
      console.warn(`[BROADCAST][${tabId}] send failed:`, e)
    }
  }

  // localStorage フォールバック（常に実行）
  try {
    localStorage.setItem(CROSS_TAB_AUTH_KEY, JSON.stringify(payload))
    console.warn(`[STORAGE][${tabId}][send] userId=${userId} source=${source}`)
  } catch (e) {
    console.warn(`[STORAGE][${tabId}] send failed:`, e)
  }
}

// 外部から呼び出し可能なエクスポート
export const notifyAuthChange = (userId: string | null) => {
  broadcastAuthChange(userId, 'explicit')
}

// =====================================================
// 🚨 isAuthPageCheck: フェイルセーフな例外判定
// 「スキップ条件は厳しく、警告条件は緩く」
// =====================================================
const isAuthPageCheck = (): { isAuthPage: boolean; reason: string } => {
  const windowPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const pathMatchesAuthPage = /^\/(login|signup)(\/|$)/.test(windowPath) ||
                               /^\/(login|signup)(\/|$)/.test(currentPath)

  // ケース1: マウントフラグON かつ パスも一致 → 確実にログインページ
  if (isAuthPageMounted && pathMatchesAuthPage) {
    return { isAuthPage: true, reason: 'mounted=true AND path=/login|signup' }
  }

  // ケース2: マウントフラグON だが パスが不一致 → 矛盾！フェイルセーフで警告する
  if (isAuthPageMounted && !pathMatchesAuthPage) {
    console.warn(`[AUTH_SWITCH][${tabId}] MISMATCH! mounted=true but path=${windowPath}/${currentPath} => FORCE ALERT`)
    return { isAuthPage: false, reason: 'MISMATCH: mounted=true but path mismatch => force alert' }
  }

  // ケース3: マウントフラグOFF → 通常ページ、警告する
  return { isAuthPage: false, reason: 'mounted=false' }
}

// =====================================================
// 🚨 handleAuthSwitch: 一本化された切替処理
// =====================================================
const handleAuthSwitch = (
  source: 'onAuthStateChange' | 'cross-tab',
  prevUserId: string,
  newUserId: string,
  setUser: (user: AuthUser | null) => void,
  newUser?: AuthUser | null
) => {
  if (typeof window === 'undefined') {
    if (newUser !== undefined) setUser(newUser)
    return
  }

  const windowPath = window.location.pathname
  const { isAuthPage, reason } = isAuthPageCheck()

  // 詳細ログ
  console.warn(`[AUTH_SWITCH][${tabId}] ${source}:`, {
    prev: prevUserId.slice(0, 8),
    next: newUserId.slice(0, 8),
    isAuthPageMounted,
    isAuthPage,
    reason,
    windowPath,
    currentPath,
    href: window.location.href
  })

  // 例外判定（厳格）
  if (isAuthPage) {
    console.warn(`[AUTH_SWITCH][${tabId}] isAuthPage=true (${reason}) => skip alert`)
    if (newUser !== undefined) setUser(newUser)
    return
  }

  console.warn(`[AUTH_SWITCH][${tabId}] isAuthPage=false (${reason}) => will show alert`)

  // ループ防止
  const now = Date.now()
  if (hasHandledAuthSwitch || (now - lastHandledAt) < AUTH_SWITCH_COOLDOWN_MS) {
    console.warn(`[AUTH_SWITCH][${tabId}] loop prevention - skipping`)
    if (newUser !== undefined) setUser(newUser)
    return
  }

  hasHandledAuthSwitch = true
  lastHandledAt = now

  // 警告 → リロード
  const targetUrl = new URL(window.location.href)
  targetUrl.searchParams.set('_ts', now.toString())

  console.warn(`[AUTH_SWITCH][${tabId}] showing alert and reloading...`, {
    targetUrl: targetUrl.toString()
  })

  window.alert('アカウントが切り替わりました。\nページを再読み込みします。')

  clearAllUserStorage(prevUserId)
  if (newUser !== undefined) setUser(newUser)

  window.location.replace(targetUrl.toString())
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  isInitializing: boolean
  authReady: boolean
  listenerSetup: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  isInitializing: false,
  authReady: false,
  listenerSetup: false,

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

      if (!state.listenerSetup) {
        logger.debug(`[AUTH_INIT][${tabId}] listener setup`)

        // =====================================================
        // タブ間通信の受信処理
        // =====================================================
        const handleCrossTabMessage = (newUserId: string, payload: any) => {
          const currentState = get()
          const currentUserId = currentState.user?.id

          // 🚨 詳細受信ログ
          console.warn(`[CROSS_TAB][${tabId}] message received:`, {
            newUserId_full: newUserId,
            currentUserId_full: currentUserId,
            fromTab: payload?.fromTab,
            source: payload?.source,
            isAuthPageMounted,
            payload_full: payload
          })

          // 自分自身からの通知は無視
          if (payload?.fromTab === tabId) {
            console.warn(`[CROSS_TAB][${tabId}] ignored (from self)`)
            return
          }

          // 同一ユーザーまたは変更なし
          if (!currentUserId || !newUserId || newUserId === 'null' || currentUserId === newUserId) {
            console.warn(`[CROSS_TAB][${tabId}] ignored (same user or no change):`, {
              reason: !currentUserId ? 'no currentUserId' :
                      !newUserId ? 'no newUserId' :
                      newUserId === 'null' ? 'newUserId is null string' :
                      'currentUserId === newUserId',
              currentUserId_full: currentUserId,
              newUserId_full: newUserId
            })
            return
          }

          console.warn(`[CROSS_TAB][${tabId}] WILL PROCESS - different users detected`)
          handleAuthSwitch('cross-tab', currentUserId, newUserId, (u) => set({ user: u }))
        }

        // BroadcastChannel 初期化
        initBroadcastChannel(handleCrossTabMessage)

        // localStorage フォールバック
        if (typeof window !== 'undefined') {
          window.addEventListener('storage', (event) => {
            if (event.key !== CROSS_TAB_AUTH_KEY || !event.newValue) return

            try {
              const payload = JSON.parse(event.newValue)
              console.warn(`[STORAGE][${tabId}] event received:`, payload)
              if (payload.userId) {
                handleCrossTabMessage(payload.userId, payload)
              }
            } catch (e) {
              console.warn(`[STORAGE][${tabId}] parse error:`, e)
            }
          })
          console.warn(`[AUTH_INIT][${tabId}] localStorage listener setup complete`)
        }

        // =====================================================
        // 🚨 onAuthStateChange でのユーザー切替検出
        // 必ず broadcast する（notifyAuthChange に依存しない）
        // =====================================================
        authService.onAuthStateChange((newUser) => {
          const currentState = get()
          const prevUserId = currentState.user?.id
          const newUserId = newUser?.id

          console.warn(`[AUTH_SWITCH][${tabId}] onAuthStateChange fired:`, {
            prev: prevUserId?.slice(0, 8) || 'none',
            next: newUserId?.slice(0, 8) || 'none',
            isAuthPageMounted
          })

          // ケース1: 同一ユーザー
          if (prevUserId === newUserId) {
            console.warn(`[AUTH_SWITCH][${tabId}] ignored (same user)`)
            return
          }

          // ケース2: null → user（初回ログイン）
          if (!prevUserId && newUserId) {
            console.warn(`[AUTH_SWITCH][${tabId}] initial login detected`)
            set({ user: newUser })
            // 🚨 必ず broadcast（他タブに通知）
            broadcastAuthChange(newUserId, 'onAuthStateChange-initial')
            return
          }

          // ケース3: user → null（ログアウト）
          if (prevUserId && !newUserId) {
            console.warn(`[AUTH_SWITCH][${tabId}] logout detected`)
            set({ user: null })
            broadcastAuthChange(null, 'onAuthStateChange-logout')
            return
          }

          // ケース4: user → different user（ユーザー切替！）
          if (prevUserId && newUserId && prevUserId !== newUserId) {
            // 🚨 詳細ログ: 何をブロードキャストするか明示
            console.warn(`[AUTH_SWITCH][${tabId}] USER SWITCH DETECTED!`, {
              prevUserId_full: prevUserId,
              newUserId_full: newUserId,
              willBroadcast: newUserId,
              newUserObj: newUser ? { id: newUser.id, email: newUser.email?.slice(0, 10) } : null
            })
            // 🚨 必ず broadcast（他タブに通知）- 新しいユーザーIDを送る
            broadcastAuthChange(newUserId, 'onAuthStateChange-switch')
            handleAuthSwitch('onAuthStateChange', prevUserId, newUserId, (u) => set({ user: u }), newUser)
          }
        })

        set({ listenerSetup: true })
        console.warn(`[AUTH_INIT][${tabId}] auth switch listener setup complete`)
      }
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
