import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'

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
      console.log('Auth initialization skipped:', { 
        globalInitialized, 
        globalInitializing, 
        localInitialized: state.isInitialized, 
        localInitializing: state.isInitializing 
      })
      return
    }

    try {
      globalInitializing = true
      set({ isLoading: true, isInitializing: true })
      
      console.log('Auth initialization starting...')
      console.log('🔧 Calling getCurrentUser (with 403 prevention)')
      const user = await authService.getCurrentUser()
      console.log('Auth initialization completed, user:', !!user)
      console.log('✅ Auth/v1/user 403 prevention successful')
      
      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      console.log('✅ Auth ready:', { hasUser: !!user, authReady: true })

      // Set up auth state listener only once
      if (!state.listenerSetup) {
        console.log('Setting up auth state listener')
        authService.onAuthStateChange((newUser) => {
          const currentState = get()
          const currentUserId = currentState.user?.id
          const newUserId = newUser?.id

          console.log('Auth state listener triggered:', {
            hasNewUser: !!newUser,
            currentUserId: currentUserId?.slice(0, 8),
            newUserId: newUserId?.slice(0, 8),
            shouldUpdate: currentUserId !== newUserId
          })

          // 🚨 CRITICAL: ユーザーが変わった場合は前ユーザーのストレージをクリア＋退避
          if (currentUserId && newUserId && currentUserId !== newUserId) {
            console.log('🚨 USER SWITCH DETECTED - 全ストレージクリア＋マイページ退避', {
              prevUserId: currentUserId.slice(0, 8),
              newUserId: newUserId.slice(0, 8),
              action: 'CLEAR_AND_REDIRECT'
            })
            clearAllUserStorage(currentUserId)
            set({ user: newUser })
            // 🔒 補強A: ユーザー切替を検出したら即座にマイページへ退避
            // edit/preview等で別ユーザーのデータが表示される混線を根絶
            if (typeof window !== 'undefined') {
              const path = window.location.pathname
              if (path.includes('/profile/edit') || path.includes('/profile/preview')) {
                console.log('🔒 USER_SWITCH_GUARD: edit/previewからmypageへ強制退避')
                window.location.replace('/mypage?reason=user_switched')
              }
            }
          } else if (currentUserId !== newUserId) {
            // 初回セットや null→user の通常遷移
            set({ user: newUser })
          }
        })
        set({ listenerSetup: true })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      globalInitialized = true // エラーでも初期化済みとマーク
      set({ user: null, isInitialized: true, authReady: true })
      console.log('✅ Auth ready (after error):', { hasUser: false, authReady: true })
    } finally {
      globalInitializing = false
      set({ isLoading: false, isInitializing: false })
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true })
      const currentUser = get().user
      // 🚨 CRITICAL: サインアウト時にユーザー固有のlocalStorageをクリア
      console.log('🧹 SignOut - clearing user storage for:', currentUser?.id?.slice(0, 8))
      clearAllUserStorage(currentUser?.id)
      await authService.signOut()
      set({ user: null })
    } catch (error) {
      console.error('Sign out error:', error)
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