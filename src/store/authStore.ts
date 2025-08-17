import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'

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
    
    // 既に初期化済みまたは初期化中の場合は何もしない
    if (state.isInitialized || state.isInitializing) {
      return
    }

    try {
      set({ isLoading: true, isInitializing: true })
      
      const user = await authService.getCurrentUser()
      set({ user, isInitialized: true })

      // Set up auth state listener only once
      if (!state.listenerSetup) {
        authService.onAuthStateChange((user) => {
          set({ user })
        })
        set({ listenerSetup: true })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ user: null, isInitialized: true })
    } finally {
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