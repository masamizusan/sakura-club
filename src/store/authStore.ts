import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// グローバルな初期化フラグ
let globalInitialized = false
let globalInitializing = false

// =====================================================
// 🚨 ループ防止ガード（指示書 3.3）
// 同一タブ内で警告→リロードが1回だけ実行されるようにする
// =====================================================
let hasHandledAuthSwitch = false
let lastHandledAt = 0
const AUTH_SWITCH_COOLDOWN_MS = 3000 // 3秒間は再実行を防止

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
        // 🚨 ユーザー切替検出（指示書 3.1, 3.2）
        // onAuthStateChange で prevUserId !== newUserId を検出
        // =====================================================
        authService.onAuthStateChange((newUser) => {
          const currentState = get()
          const prevUserId = currentState.user?.id
          const newUserId = newUser?.id

          // デバッグログ（指示書 4.2）
          console.warn('[AUTH_SWITCH] onAuthStateChange fired:', {
            prev: prevUserId?.slice(0, 8) || 'none',
            next: newUserId?.slice(0, 8) || 'none',
            path: typeof window !== 'undefined' ? window.location.pathname : 'SSR'
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
            console.warn('[AUTH_SWITCH] USER SWITCH DETECTED!', {
              prev: prevUserId.slice(0, 8),
              next: newUserId.slice(0, 8)
            })

            // 前ユーザーのストレージをクリア
            clearAllUserStorage(prevUserId)
            set({ user: newUser })

            // ブラウザ環境でのみ実行
            if (typeof window === 'undefined') {
              return
            }

            const path = window.location.pathname

            // 例外ページチェック（指示書 3.2）
            if (path === '/login' || path === '/signup' ||
                path.startsWith('/login') || path.startsWith('/signup')) {
              console.warn('[AUTH_SWITCH] on login/signup page - skip alert')
              return
            }

            // ループ防止チェック（指示書 3.3）
            const now = Date.now()
            if (hasHandledAuthSwitch || (now - lastHandledAt) < AUTH_SWITCH_COOLDOWN_MS) {
              console.warn('[AUTH_SWITCH] loop prevention - skipping (already handled or cooldown)')
              return
            }

            // ガードを設定
            hasHandledAuthSwitch = true
            lastHandledAt = now

            console.warn('[AUTH_SWITCH] showing alert and reloading...')

            // 警告を表示（指示書 3.2）
            window.alert('アカウントが切り替わりました。\nページを再読み込みします。')

            // リロード（B案: キャッシュ回避のためタイムスタンプ付与）
            const currentUrl = new URL(window.location.href)
            currentUrl.searchParams.set('_ts', now.toString())
            window.location.href = currentUrl.toString()
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
