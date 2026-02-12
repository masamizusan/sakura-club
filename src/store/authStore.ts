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

// =====================================================
// 🆕 タブ間通信用（localStorage + storage イベント）
// Supabase SSRクライアントはcookieベースなので、
// onAuthStateChangeがタブ間で伝播しない問題を解決
// =====================================================
const CROSS_TAB_AUTH_KEY = 'sc_auth_current_user_id'

// ログイン成功時に他タブへ通知
export const notifyAuthChange = (userId: string | null) => {
  if (typeof window !== 'undefined') {
    const value = userId ? `${userId}:${Date.now()}` : `null:${Date.now()}`
    localStorage.setItem(CROSS_TAB_AUTH_KEY, value)
    console.warn('[AUTH_CROSS_TAB] notified:', userId?.slice(0, 8) || 'null')
  }
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
        // 🚨 ユーザー切替検出（指示書 3.1, 3.2）
        // onAuthStateChange で prevUserId !== newUserId を検出
        // =====================================================
        authService.onAuthStateChange((newUser) => {
          // =====================================================
          // 🚨 指示書 3.1: パスを最初に固定する（これ以降は変わらない）
          // =====================================================
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
          const currentSearch = typeof window !== 'undefined' ? window.location.search : ''

          const currentState = get()
          const prevUserId = currentState.user?.id
          const newUserId = newUser?.id

          // デバッグログ（指示書 4）
          console.warn('[AUTH_SWITCH] onAuthStateChange fired:', {
            prev: prevUserId?.slice(0, 8) || 'none',
            next: newUserId?.slice(0, 8) || 'none',
            currentPath  // 固定したパスを表示
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
              next: newUserId.slice(0, 8),
              currentPath  // 固定したパスを表示
            })

            // ブラウザ環境でのみ実行
            if (typeof window === 'undefined') {
              set({ user: newUser })
              return
            }

            // =====================================================
            // 🚨 指示書 3.2: 例外ページ判定（厳密な一致）
            // =====================================================
            const isAuthPage =
              currentPath === '/login' ||
              currentPath === '/signup' ||
              currentPath.startsWith('/login/') ||
              currentPath.startsWith('/signup/')

            console.warn('[AUTH_SWITCH] isAuthPage?', { currentPath, isAuthPage })

            if (isAuthPage) {
              console.warn('[AUTH_SWITCH] on login/signup page - skip alert (state updated only)')
              set({ user: newUser })
              return
            }

            // =====================================================
            // 🚨 指示書 3.4: ループ防止チェック
            // =====================================================
            const now = Date.now()
            if (hasHandledAuthSwitch || (now - lastHandledAt) < AUTH_SWITCH_COOLDOWN_MS) {
              console.warn('[AUTH_SWITCH] loop prevention - skipping (already handled or cooldown)')
              set({ user: newUser })
              return
            }

            // ガードを設定
            hasHandledAuthSwitch = true
            lastHandledAt = now

            // =====================================================
            // 🚨 指示書 3.3: 警告 → リロード を必ず実行
            // =====================================================
            const targetUrl = new URL(window.location.href)
            targetUrl.searchParams.set('_ts', now.toString())

            console.warn('[AUTH_SWITCH] showing alert and reloading...', {
              targetUrl: targetUrl.toString()
            })

            // 警告を表示
            window.alert('アカウントが切り替わりました。\nページを再読み込みします。')

            // =====================================================
            // 🚨 指示書 3.5: クリア処理は警告の後
            // =====================================================
            clearAllUserStorage(prevUserId)
            set({ user: newUser })

            // リロード（B案: キャッシュ回避のためタイムスタンプ付与）
            window.location.replace(targetUrl.toString())
          }
        })

        // =====================================================
        // 🆕 タブ間通信: localStorage の storage イベントを監視
        // Supabase SSRはcookieベースなのでonAuthStateChangeが
        // タブ間で伝播しない → localStorageで補完
        // =====================================================
        if (typeof window !== 'undefined') {
          window.addEventListener('storage', (event) => {
            if (event.key !== CROSS_TAB_AUTH_KEY || !event.newValue) return

            const [newUserId] = event.newValue.split(':')
            const currentState = get()
            const currentUserId = currentState.user?.id

            // パスを最初に固定
            const currentPath = window.location.pathname

            console.warn('[CROSS_TAB] storage event received:', {
              newUserId: newUserId?.slice(0, 8) || 'null',
              currentUserId: currentUserId?.slice(0, 8) || 'null',
              currentPath
            })

            // 同一ユーザーまたは変更なし
            if (!currentUserId || !newUserId || newUserId === 'null' || currentUserId === newUserId) {
              console.warn('[CROSS_TAB] ignored (same user or no change)')
              return
            }

            // ユーザー切替検出！
            console.warn('[CROSS_TAB] USER SWITCH from another tab!', {
              prev: currentUserId.slice(0, 8),
              next: newUserId.slice(0, 8),
              currentPath
            })

            // auth page チェック
            const isAuthPage =
              currentPath === '/login' ||
              currentPath === '/signup' ||
              currentPath.startsWith('/login/') ||
              currentPath.startsWith('/signup/')

            console.warn('[CROSS_TAB] isAuthPage?', { currentPath, isAuthPage })

            if (isAuthPage) {
              console.warn('[CROSS_TAB] on login/signup page - skip alert')
              return
            }

            // ループ防止
            const now = Date.now()
            if (hasHandledAuthSwitch || (now - lastHandledAt) < AUTH_SWITCH_COOLDOWN_MS) {
              console.warn('[CROSS_TAB] loop prevention - skipping')
              return
            }

            hasHandledAuthSwitch = true
            lastHandledAt = now

            const targetUrl = new URL(window.location.href)
            targetUrl.searchParams.set('_ts', now.toString())

            console.warn('[CROSS_TAB] showing alert and reloading...', {
              targetUrl: targetUrl.toString()
            })

            window.alert('別のタブで他のアカウントにログインしました。\nページを再読み込みして、新しいアカウントに切り替えます。')

            clearAllUserStorage(currentUserId)
            window.location.replace(targetUrl.toString())
          })
          console.warn('[AUTH_INIT] cross-tab storage listener setup complete')
        }

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
