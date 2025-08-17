'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useAuthStore((state) => state.initialize)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isInitializing = useAuthStore((state) => state.isInitializing)
  const hasInitialized = useRef(false)

  useEffect(() => {
    // 既に初期化済みまたは初期化中の場合は何もしない
    if (hasInitialized.current || isInitialized || isInitializing) {
      return
    }

    hasInitialized.current = true
    console.log('AuthProvider: Starting initialization')
    initialize()
  }, [initialize, isInitialized, isInitializing])

  return <>{children}</>
}