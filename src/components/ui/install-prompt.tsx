'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // PWAがすでにインストールされているかチェック
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSInstalled = (window.navigator as any).standalone === true
      setIsInstalled(isStandalone || isIOSInstalled)
    }

    checkIfInstalled()

    // beforeinstallpromptイベントをリッスン
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      
      // インストールプロンプトを表示するかどうかを判断
      const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen')
      if (!hasSeenPrompt && !isInstalled) {
        setShowPrompt(true)
      }
    }

    // アプリがインストールされた時のイベント
    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
    } catch (error) {
      console.error('Error during install prompt:', error)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-prompt-seen', 'true')
    
    // 24時間後に再度表示できるようにする
    setTimeout(() => {
      localStorage.removeItem('pwa-install-prompt-seen')
    }, 24 * 60 * 60 * 1000)
  }

  // iOS Safari用の手動インストール手順
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  if (isInstalled || !showPrompt) {
    return null
  }

  if (isIOS && isSafari && !deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-sakura-200 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <Smartphone className="w-5 h-5 text-sakura-600 mr-2" />
            <h3 className="font-semibold text-gray-900">アプリとして追加</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          Sakura Clubをホーム画面に追加して、アプリのように使用できます。
        </p>
        
        <div className="text-xs text-gray-500 space-y-1">
          <p>1. 画面下部の共有ボタン □ をタップ</p>
          <p>2. 「ホーム画面に追加」を選択</p>
          <p>3. 「追加」をタップ</p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
          className="w-full mt-3"
        >
          わかりました
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-sakura-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <Download className="w-5 h-5 text-sakura-600 mr-2" />
          <h3 className="font-semibold text-gray-900">アプリをインストール</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Sakura Clubをインストールして、より快適にご利用いただけます。
      </p>
      
      <div className="flex space-x-2">
        <Button
          variant="sakura"
          size="sm"
          onClick={handleInstall}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          インストール
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
          className="flex-1"
        >
          後で
        </Button>
      </div>
    </div>
  )
}