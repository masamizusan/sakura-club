import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// グローバルな初期化フラグ
let globalInitialized = false
let globalInitializing = false

// =====================================================
// 🚨 ループ防止ガード（指示書 2.5）
// 同一タブ内で警告→リロードが1回だけ実行されるようにする
// onAuthStateChange と タブ間通知 の両方で共有
// =====================================================
let hasHandledAuthSwitch = false
let lastHandledAt = 0
const AUTH_SWITCH_COOLDOWN_MS = 3000 // 3秒間は再実行を防止

// =====================================================
// 🆕 現在パス保持（usePathname() から同期）
// window.location.pathname は App Router でズレることがあるため
// usePathname() の値を正として扱う
// =====================================================
let currentPath = ''

export function setCurrentPath(path: string) {
  currentPath = path
  console.warn('[AUTH_PATH] stored:', path)
}

export function getCurrentPath(): string {
  return currentPath
}

// =====================================================
// 🆕 タブ間通信用（BroadcastChannel + localStorage フォールバック）
// 指示書 2.2: BroadcastChannel を第一候補
// =====================================================
const AUTH_CHANNEL_NAME = 'auth-switch'
const CROSS_TAB_AUTH_KEY = '__auth_switch__'

let authChannel: BroadcastChannel | null = null

// BroadcastChannel の初期化
const initBroadcastChannel = (onMessage: (userId: string) => void) => {
  if (typeof window === 'undefined') return

  try {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    authChannel.onmessage = (event) => {
      const { userId, at } = event.data || {}
      if (userId) {
        console.warn('[BROADCAST] received:', { userId: userId?.slice(0, 8), at })
        onMessage(userId)
      }
    }
    console.warn('[AUTH_INIT] BroadcastChannel initialized')
  } catch (e) {
    console.warn('[AUTH_INIT] BroadcastChannel not supported, using localStorage only')
    authChannel = null
  }
}

// ログイン成功時に他タブへ通知（BroadcastChannel + localStorage）
export const notifyAuthChange = (userId: string | null) => {
  if (typeof window === 'undefined') return

  const payload = { userId, at: Date.now() }

  // BroadcastChannel で送信（第一候補）
  if (authChannel) {
    try {
      authChannel.postMessage(payload)
      console.warn('[BROADCAST] sent:', userId?.slice(0, 8) || 'null')
    } catch (e) {
      console.warn('[BROADCAST] send failed:', e)
    }
  }

  // localStorage フォールバック
  try {
    localStorage.setItem(CROSS_TAB_AUTH_KEY, JSON.stringify(payload))
    console.warn('[STORAGE] sent:', userId?.slice(0, 8) || 'null')
  } catch (e) {
    console.warn('[STORAGE] send failed:', e)
  }
}

// =====================================================
// 🚨 handleAuthSwitch: 一本化された切替処理
// onAuthStateChange と タブ間通知 の両方からここを呼ぶ
// =====================================================
const handleAuthSwitch = (
  source: 'onAuthStateChange' | 'cross-tab',
  prevUserId: string,
  newUserId: string,
  setUser: (user: AuthUser | null) => void,
  newUser?: AuthUser | null
) => {
  // ブラウザ環境でのみ実行
  if (typeof window === 'undefined') {
    if (newUser !== undefined) setUser(newUser)
    return
  }

  // =====================================================
  // 🚨 パス判定：currentPath（usePathname由来）を優先
  // フォールバックとして window.location.pathname
  // =====================================================
  const windowPath = window.location.pathname
  const pathNow = currentPath || windowPath

  // currentPath が空の場合はフォールバックを使用したことをログ
  if (!currentPath) {
    console.warn('[AUTH_SWITCH] currentPath empty, fallback to window.location.pathname:', windowPath)
  }

  const isAuthPageNow = /^\/(login|signup)(\/|$)/.test(pathNow)

  // デバッグログ（必須）
  console.warn(`[AUTH_SWITCH] ${source}:`, {
    prev: prevUserId.slice(0, 8),
    next: newUserId.slice(0, 8),
    currentPath,
    windowPath,
    pathNow,
    isAuthPageNow,
    href: window.location.href
  })

  // 例外ページなら何もしない
  if (isAuthPageNow) {
    console.warn(`[AUTH_SWITCH] pathNow="${pathNow}" isAuthPageNow=true`)
    console.warn('[AUTH_SWITCH] on login/signup page - skip alert')
    if (newUser !== undefined) setUser(newUser)
    return
  }

  console.warn(`[AUTH_SWITCH] pathNow="${pathNow}" isAuthPageNow=false`)

  // =====================================================
  // 🚨 ループ防止チェック
  // onAuthStateChange と cross-tab の両方で共有
  // =====================================================
  const now = Date.now()
  if (hasHandledAuthSwitch || (now - lastHandledAt) < AUTH_SWITCH_COOLDOWN_MS) {
    console.warn('[AUTH_SWITCH] loop prevention - skipping (already handled or cooldown)')
    if (newUser !== undefined) setUser(newUser)
    return
  }

  // ガードを設定
  hasHandledAuthSwitch = true
  lastHandledAt = now

  // =====================================================
  // 🚨 警告 → リロード
  // =====================================================
  const targetUrl = new URL(window.location.href)
  targetUrl.searchParams.set('_ts', now.toString())

  console.warn('[AUTH_SWITCH] showing alert and reloading...', {
    targetUrl: targetUrl.toString()
  })

  // 警告を表示
  window.alert('アカウントが切り替わりました。\nページを再読み込みします。')

  // クリア処理は警告の後（状態が壊れて分岐が狂うのを防止）
  clearAllUserStorage(prevUserId)
  if (newUser !== undefined) setUser(newUser)

  // リロード（B案: キャッシュ回避のためタイムスタンプ付与）
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

    // グローバルフラグとローカル状態の両方をチェック
    if (globalInitialized || globalInitializing || state.isInitialized || state.isInitializing) {
      logger.debug('[AUTH_INIT] skipped', { global: globalInitialized, localInit: state.isInitialized })
      return
    }

    try {
      globalInitializing = true
      set({ isLoading: true, isInitializing: true })

      logger.debug('[AUTH_INIT] starting')
      const user = await authService.getCurrentUser()

      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      logger.debug('[AUTH_INIT] ready', { hasUser: !!user })

      if (!state.listenerSetup) {
        logger.debug('[AUTH_INIT] listener setup')

        // =====================================================
        // タブ間通信の受信処理（共通）
        // =====================================================
        const handleCrossTabMessage = (newUserId: string) => {
          const currentState = get()
          const currentUserId = currentState.user?.id

          console.warn('[CROSS_TAB] message received:', {
            newUserId: newUserId?.slice(0, 8) || 'null',
            currentUserId: currentUserId?.slice(0, 8) || 'null',
            currentPath
          })

          // 同一ユーザーまたは変更なし
          if (!currentUserId || !newUserId || newUserId === 'null' || currentUserId === newUserId) {
            console.warn('[CROSS_TAB] ignored (same user or no change)')
            return
          }

          // ユーザー切替検出！→ handleAuthSwitch に委譲
          handleAuthSwitch('cross-tab', currentUserId, newUserId, (u) => set({ user: u }))
        }

        // =====================================================
        // 🚨 BroadcastChannel の初期化
        // =====================================================
        initBroadcastChannel(handleCrossTabMessage)

        // =====================================================
        // 🚨 localStorage フォールバック
        // =====================================================
        if (typeof window !== 'undefined') {
          window.addEventListener('storage', (event) => {
            if (event.key !== CROSS_TAB_AUTH_KEY || !event.newValue) return

            try {
              const payload = JSON.parse(event.newValue)
              const newUserId = payload.userId
              console.warn('[STORAGE] event received:', { newUserId: newUserId?.slice(0, 8) })
              if (newUserId) {
                handleCrossTabMessage(newUserId)
              }
            } catch (e) {
              console.warn('[STORAGE] parse error:', e)
            }
          })
          console.warn('[AUTH_INIT] localStorage storage listener setup complete')
        }

        // =====================================================
        // 🚨 onAuthStateChange でのユーザー切替検出
        // =====================================================
        authService.onAuthStateChange((newUser) => {
          const currentState = get()
          const prevUserId = currentState.user?.id
          const newUserId = newUser?.id

          // デバッグログ
          console.warn('[AUTH_SWITCH] onAuthStateChange fired:', {
            prev: prevUserId?.slice(0, 8) || 'none',
            next: newUserId?.slice(0, 8) || 'none',
            currentPath
          })

          // ケース1: 同一ユーザー（token refresh等）→ 何もしない
          if (prevUserId === newUserId) {
            console.warn('[AUTH_SWITCH] ignored (same user or no change)')
            return
          }

          // ケース2: null → user（初回ログイン）→ 状態更新のみ
          if (!prevUserId && newUserId) {
            console.warn('[AUTH_SWITCH] initial login detected, updating state')
            set({ user: newUser })
            return
          }

          // ケース3: user → null（ログアウト）→ 状態更新のみ
          if (prevUserId && !newUserId) {
            console.warn('[AUTH_SWITCH] logout detected, updating state')
            set({ user: null })
            return
          }

          // ケース4: user → different user（ユーザー切替！）
          if (prevUserId && newUserId && prevUserId !== newUserId) {
            console.warn('[AUTH_SWITCH] USER SWITCH DETECTED!')
            handleAuthSwitch('onAuthStateChange', prevUserId, newUserId, (u) => set({ user: u }), newUser)
          }
        })

        set({ listenerSetup: true })
        console.warn('[AUTH_INIT] auth switch listener setup complete')
      }
    } catch (error) {
      logger.error('[AUTH_INIT]', error)
      globalInitialized = true
      set({ user: null, isInitialized: true, authReady: true })
      logger.debug('[AUTH_INIT] ready (after error)')
    } finally {
      globalInitializing = false
      set({ isLoading: false, isInitializing: false })
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true })
      const currentUser = get().user
      logger.debug('[AUTH] signOut', { userId: currentUser?.id?.slice(0, 8) })
      clearAllUserStorage(currentUser?.id)
      await authService.signOut()
      set({ user: null })
    } catch (error) {
      logger.error('[AUTH] signOut', error)
    } finally {
      set({ isLoading: false })
    }
  },
}))

// Hook for easy access to auth state
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
