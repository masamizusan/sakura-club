// プッシュ通知管理クラス
export class PushNotificationManager {
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  // プッシュ通知の権限を要求
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('このブラウザは通知をサポートしていません')
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  // Service Worker登録とプッシュ購読
  async subscribeToPush(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready
      
      if (!registration.pushManager) {
        throw new Error('プッシュ通知がサポートされていません')
      }

      // 既存の購読があるかチェック
      let subscription = await registration.pushManager.getSubscription()
      
      if (!subscription) {
        // 新しい購読を作成
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey || '')
        })
      }

      return subscription
    } catch (error) {
      console.error('プッシュ通知の購読に失敗:', error)
      return null
    }
  }

  // プッシュ購読をサーバーに送信
  async sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
    try {
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      })

      return response.ok
    } catch (error) {
      console.error('購読情報の送信に失敗:', error)
      return false
    }
  }

  // プッシュ通知の購読解除
  async unsubscribeFromPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        const unsubscribed = await subscription.unsubscribe()
        
        if (unsubscribed) {
          // サーバーからも削除
          await fetch('/api/push-subscription', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint
            })
          })
        }
        
        return unsubscribed
      }
      
      return true
    } catch (error) {
      console.error('プッシュ通知の購読解除に失敗:', error)
      return false
    }
  }

  // 即座に表示するローカル通知
  async showLocalNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    const permission = await this.requestPermission()
    
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options
      })
    }
  }

  // テスト通知を送信
  async sendTestNotification(): Promise<boolean> {
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'テスト通知',
          message: 'Sakura Clubのプッシュ通知が正常に動作しています！',
          data: {
            url: '/matches'
          }
        })
      })

      return response.ok
    } catch (error) {
      console.error('テスト通知の送信に失敗:', error)
      return false
    }
  }

  // VAPID公開鍵をUint8Arrayに変換
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // 現在の購読状態を取得
  async getSubscriptionStatus(): Promise<{
    isSupported: boolean
    isSubscribed: boolean
    permission: NotificationPermission
  }> {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    
    if (!isSupported) {
      return {
        isSupported: false,
        isSubscribed: false,
        permission: 'default'
      }
    }

    const permission = Notification.permission
    let isSubscribed = false

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed = !!subscription
    } catch (error) {
      console.error('購読状態の確認に失敗:', error)
    }

    return {
      isSupported,
      isSubscribed,
      permission
    }
  }
}

export const pushNotificationManager = new PushNotificationManager()