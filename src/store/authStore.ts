import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// グローバルな初期化フラグ
let globalInitialized = false
let globalInitializing = false

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
        authService.onAuthStateChange((newUser) => {
          const currentState = get()
          const currentUserId = currentState.user?.id
          const newUserId = newUser?.id

          logger.debug('[AUTH_LISTENER]', {
            hasNewUser: !!newUser,
            currentUserId: currentUserId?.slice(0, 8),
            newUserId: newUserId?.slice(0, 8),
          })

          // 🚨 CRITICAL: ユーザーが変わった場合は前ユーザーのストレージをクリア＋ページリロード
          if (currentUserId && newUserId && currentUserId !== newUserId) {
            logger.warn('[AUTH_LISTENER] USER_SWITCH', {
              prevUserId: currentUserId.slice(0, 8),
              newUserId: newUserId.slice(0, 8),
            })
            clearAllUserStorage(currentUserId)
            set({ user: newUser })

            // 認証関連ページでは警告・リロードをスキップ（ユーザーが意図的にログイン操作中）
            if (typeof window !== 'undefined') {
              const path = window.location.pathname
              const isAuthPage = path.includes('/login') ||
                                 path.includes('/signup') ||
                                 path.includes('/register')

              // デバッグ: パス判定の詳細を出力
              console.warn('[AUTH_LISTENER] USER_SWITCH path check:', {
                path,
                isAuthPage,
                href: window.location.href
              })

              if (isAuthPage) {
                console.warn('[AUTH_LISTENER] USER_SWITCH on auth page - skip alert')
                // 認証ページでは静かに状態更新のみ（リロードも不要）
              } else {
                // 通常ページでは警告を表示してリロード
                console.warn('[AUTH_LISTENER] USER_SWITCH: forcing page reload NOW')
                window.alert(
                  '別のアカウントでログインが検出されました。\n' +
                  'ページを再読み込みして、新しいアカウントに切り替えます。'
                )
                window.location.reload()
              }
            } else {
              console.warn('[AUTH_LISTENER] USER_SWITCH: window is undefined (SSR?)')
            }
          } else if (currentUserId !== newUserId) {
            // 初回セットや null→user の通常遷移
            set({ user: newUser })
          }
        })
        set({ listenerSetup: true })
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