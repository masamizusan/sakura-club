import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'

// グローバルな初期化フラグ
let globalInitialized = false
let globalInitializing = false

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  isInitializing: boolean
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
      const user = await authService.getCurrentUser()
      console.log('Auth initialization completed, user:', !!user)
      
      globalInitialized = true
      set({ user, isInitialized: true })

      // Set up auth state listener only once
      if (!state.listenerSetup) {
        console.log('Setting up auth state listener')
        authService.onAuthStateChange((user) => {
          console.log('Auth state changed, user:', !!user)
          set({ user })
        })
        set({ listenerSetup: true })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      globalInitialized = true // エラーでも初期化済みとマーク
      set({ user: null, isInitialized: true })
    } finally {
      globalInitializing = false
      set({ isLoading: false, isInitializing: false })
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true })
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
  const { user, isLoading, isInitialized, signOut } = useAuthStore()
  return {
    user,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    logout: signOut,
  }
}