'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login')
    }
  }, [user, isInitialized, router])

  if (isLoading || !isInitialized) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      )
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return <>{children}</>
}