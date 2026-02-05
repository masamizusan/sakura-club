'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { logger } from '@/utils/logger'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useAuthStore((state) => state.initialize)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isInitializing = useAuthStore((state) => state.isInitializing)
  const hasInitialized = useRef(false)
  const mountCount = useRef(0)

  useEffect(() => {
    mountCount.current += 1
    if (hasInitialized.current || isInitialized || isInitializing) {
      return
    }

    hasInitialized.current = true
    logger.debug('[AUTH_PROVIDER]', {
      env: process.env.NODE_ENV ?? 'unknown',
      isStrictModeLikely: mountCount.current > 1,
      mountCount: mountCount.current,
    })
    initialize()
  }, [initialize, isInitialized, isInitializing])

  return <>{children}</>
}