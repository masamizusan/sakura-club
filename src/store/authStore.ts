import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  
  setLoading: (loading) => set({ isLoading: loading }),

  initialize: async () => {
    try {
      set({ isLoading: true })
      
      const user = await authService.getCurrentUser()
      set({ user, isInitialized: true })

      // Set up auth state listener
      authService.onAuthStateChange((user) => {
        set({ user })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ user: null, isInitialized: true })
    } finally {
      set({ isLoading: false })
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
  const { user, isLoading, isInitialized } = useAuthStore()
  return {
    user,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
  }
}