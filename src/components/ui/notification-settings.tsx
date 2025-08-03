'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, Smartphone, CheckCircle, AlertCircle } from 'lucide-react'
import { pushNotificationManager } from '@/lib/push-notifications'

export function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    checkNotificationStatus()
  }, [])

  const checkNotificationStatus = async () => {
    const status = await pushNotificationManager.getSubscriptionStatus()
    setIsSupported(status.isSupported)
    setIsSubscribed(status.isSubscribed)
    setPermission(status.permission)
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      // 権限を要求
      const newPermission = await pushNotificationManager.requestPermission()
      setPermission(newPermission)

      if (newPermission !== 'granted') {
        setMessage('通知の許可が必要です。ブラウザの設定から許可してください。')
        return
      }

      // プッシュ通知に購読
      const subscription = await pushNotificationManager.subscribeToPush()
      
      if (!subscription) {
        setMessage('プッシュ通知の設定に失敗しました。')
        return
      }

      // サーバーに購読情報を送信
      const success = await pushNotificationManager.sendSubscriptionToServer(subscription)
      
      if (success) {
        setIsSubscribed(true)
        setMessage('プッシュ通知が有効になりました！')
        
        // テスト通知を送信
        setTimeout(async () => {
          await pushNotificationManager.sendTestNotification()
        }, 1000)
      } else {
        setMessage('サーバーへの登録に失敗しました。')
      }
    } catch (error) {
      console.error('通知設定エラー:', error)
      setMessage('通知の設定中にエラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      const success = await pushNotificationManager.unsubscribeFromPush()
      
      if (success) {
        setIsSubscribed(false)
        setMessage('プッシュ通知を無効にしました。')
      } else {
        setMessage('通知の無効化に失敗しました。')
      }
    } catch (error) {
      console.error('通知無効化エラー:', error)
      setMessage('通知の無効化中にエラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = async () => {
    setIsLoading(true)
    
    try {
      const success = await pushNotificationManager.sendTestNotification()
      
      if (success) {
        setMessage('テスト通知を送信しました！')
      } else {
        setMessage('テスト通知の送信に失敗しました。')
      }
    } catch (error) {
      console.error('テスト通知エラー:', error)
      setMessage('テスト通知の送信中にエラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
          <h3 className="font-medium text-yellow-800">プッシュ通知は利用できません</h3>
        </div>
        <p className="text-sm text-yellow-700">
          お使いのブラウザはプッシュ通知をサポートしていません。Chrome、Firefox、Safari などの最新ブラウザをご利用ください。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Smartphone className="w-5 h-5 text-sakura-600 mr-2" />
            <h3 className="font-semibold text-gray-900">プッシュ通知</h3>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isSubscribed
              ? 'bg-green-100 text-green-800'
              : permission === 'denied'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isSubscribed ? '有効' : permission === 'denied' ? '拒否' : '無効'}
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          新しいマッチやメッセージ、体験の招待などの重要な通知をリアルタイムで受け取れます。
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {!isSubscribed ? (
            <Button
              onClick={handleEnableNotifications}
              disabled={isLoading || permission === 'denied'}
              variant="sakura"
              className="flex-1"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              {permission === 'denied' ? '通知が拒否されています' : '通知を有効にする'}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleDisableNotifications}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                通知を無効にする
              </Button>
              <Button
                onClick={handleTestNotification}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                テスト通知
              </Button>
            </>
          )}
        </div>

        {permission === 'denied' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              通知が拒否されています。ブラウザの設定から Sakura Club の通知を許可してください。
            </p>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-3 border rounded-lg ${
            message.includes('失敗') || message.includes('エラー')
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <div className="flex items-center">
              {message.includes('失敗') || message.includes('エラー') ? (
                <AlertCircle className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}
      </div>

      {/* 通知タイプの設定 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">通知の種類</h4>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-gray-300 text-sakura-600 focus:ring-sakura-500"
            />
            <span className="ml-2 text-sm text-gray-700">新しいマッチ</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-gray-300 text-sakura-600 focus:ring-sakura-500"
            />
            <span className="ml-2 text-sm text-gray-700">新しいメッセージ</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-gray-300 text-sakura-600 focus:ring-sakura-500"
            />
            <span className="ml-2 text-sm text-gray-700">体験の招待</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-gray-300 text-sakura-600 focus:ring-sakura-500"
            />
            <span className="ml-2 text-sm text-gray-700">体験のリマインダー</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-gray-300 text-sakura-600 focus:ring-sakura-500"
            />
            <span className="ml-2 text-sm text-gray-700">レビューの依頼</span>
          </label>
        </div>
      </div>
    </div>
  )
}