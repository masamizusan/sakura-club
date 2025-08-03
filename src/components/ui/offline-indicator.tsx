'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi, RefreshCw, CheckCircle } from 'lucide-react'
import { networkMonitor } from '@/lib/offline-storage'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleNetworkChange = (online: boolean) => {
      setIsOnline(online)
      
      if (!online) {
        // オフラインになったら即座に表示
        setShowIndicator(true)
        setIsConnecting(false)
      } else {
        // オンラインになったら接続中状態を表示
        setIsConnecting(true)
        setShowIndicator(true)
        
        // 2秒後に成功状態を表示してから非表示
        timeoutId = setTimeout(() => {
          setIsConnecting(false)
          
          setTimeout(() => {
            setShowIndicator(false)
          }, 1500)
        }, 2000)
      }
    }

    const unsubscribe = networkMonitor.onNetworkChange(handleNetworkChange)

    return () => {
      unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  if (!showIndicator) return null

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      showIndicator ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className={`px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 text-sm font-medium ${
        isOnline
          ? isConnecting
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            : 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isOnline ? (
          isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>接続中...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>オンラインに復旧しました</span>
            </>
          )
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>オフラインモード</span>
          </>
        )}
      </div>
    </div>
  )
}

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const unsubscribe = networkMonitor.onNetworkChange(setIsOnline)
    return unsubscribe
  }, [])

  return (
    <div className="flex items-center space-x-1">
      {isOnline ? (
        <Wifi className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-500" />
      )}
      <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
        {isOnline ? 'オンライン' : 'オフライン'}
      </span>
    </div>
  )
}