// IndexedDB wrapper for offline data storage
class OfflineStorage {
  private dbName = 'sakura-club-offline'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // メッセージ用ストア
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' })
          messageStore.createIndex('conversationId', 'conversationId', { unique: false })
          messageStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // 通知用ストア
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' })
          notificationStore.createIndex('timestamp', 'createdAt', { unique: false })
        }

        // マッチ用ストア
        if (!db.objectStoreNames.contains('matches')) {
          const matchStore = db.createObjectStore('matches', { keyPath: 'id' })
          matchStore.createIndex('timestamp', 'createdAt', { unique: false })
        }

        // 体験用ストア
        if (!db.objectStoreNames.contains('experiences')) {
          const experienceStore = db.createObjectStore('experiences', { keyPath: 'id' })
          experienceStore.createIndex('date', 'date', { unique: false })
        }

        // 同期待ちアクション用ストア
        if (!db.objectStoreNames.contains('pending-actions')) {
          const actionStore = db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true })
          actionStore.createIndex('timestamp', 'timestamp', { unique: false })
          actionStore.createIndex('type', 'type', { unique: false })
        }
      }
    })
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const transaction = this.db.transaction([storeName], mode)
    return transaction.objectStore(storeName)
  }

  // メッセージの保存
  async saveMessage(message: any): Promise<void> {
    const store = this.getStore('messages', 'readwrite')
    await this.promisifyRequest(store.put({
      ...message,
      synced: navigator.onLine
    }))
  }

  // メッセージの取得
  async getMessages(conversationId: string): Promise<any[]> {
    const store = this.getStore('messages')
    const index = store.index('conversationId')
    const request = index.getAll(conversationId)
    return this.promisifyRequest(request)
  }

  // 通知の保存
  async saveNotification(notification: any): Promise<void> {
    const store = this.getStore('notifications', 'readwrite')
    await this.promisifyRequest(store.put(notification))
  }

  // 通知の取得
  async getNotifications(): Promise<any[]> {
    const store = this.getStore('notifications')
    return this.promisifyRequest(store.getAll())
  }

  // マッチの保存
  async saveMatch(match: any): Promise<void> {
    const store = this.getStore('matches', 'readwrite')
    await this.promisifyRequest(store.put(match))
  }

  // マッチの取得
  async getMatches(): Promise<any[]> {
    const store = this.getStore('matches')
    return this.promisifyRequest(store.getAll())
  }

  // 体験の保存
  async saveExperience(experience: any): Promise<void> {
    const store = this.getStore('experiences', 'readwrite')
    await this.promisifyRequest(store.put(experience))
  }

  // 体験の取得
  async getExperiences(): Promise<any[]> {
    const store = this.getStore('experiences')
    return this.promisifyRequest(store.getAll())
  }

  // 同期待ちアクションの保存
  async savePendingAction(action: {
    type: string
    data: any
    endpoint: string
    method: string
  }): Promise<void> {
    const store = this.getStore('pending-actions', 'readwrite')
    await this.promisifyRequest(store.put({
      ...action,
      timestamp: Date.now()
    }))
  }

  // 同期待ちアクションの取得
  async getPendingActions(): Promise<any[]> {
    const store = this.getStore('pending-actions')
    return this.promisifyRequest(store.getAll())
  }

  // 同期待ちアクションの削除
  async deletePendingAction(id: number): Promise<void> {
    const store = this.getStore('pending-actions', 'readwrite')
    await this.promisifyRequest(store.delete(id))
  }

  // 古いデータの削除（パフォーマンス向上のため）
  async cleanupOldData(): Promise<void> {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7日前

    // 古いメッセージを削除
    const messageStore = this.getStore('messages', 'readwrite')
    const messageIndex = messageStore.index('timestamp')
    const messageCursor = await this.promisifyRequest(
      messageIndex.openCursor(IDBKeyRange.upperBound(cutoffTime))
    )
    
    if (messageCursor) {
      await this.promisifyRequest(messageCursor.delete())
    }

    // 古い通知を削除
    const notificationStore = this.getStore('notifications', 'readwrite')
    const notificationIndex = notificationStore.index('timestamp')
    const notificationCursor = await this.promisifyRequest(
      notificationIndex.openCursor(IDBKeyRange.upperBound(cutoffTime))
    )
    
    if (notificationCursor) {
      await this.promisifyRequest(notificationCursor.delete())
    }
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

export const offlineStorage = new OfflineStorage()

// オンライン状態の監視
export class NetworkMonitor {
  private listeners: ((isOnline: boolean) => void)[] = []

  constructor() {
    this.setupListeners()
  }

  private setupListeners(): void {
    window.addEventListener('online', () => {
      console.log('Network: Online')
      this.notifyListeners(true)
      this.syncPendingActions()
    })

    window.addEventListener('offline', () => {
      console.log('Network: Offline')
      this.notifyListeners(false)
    })
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback)
    
    // 初期状態をコールバックで通知
    callback(this.isOnline())
    
    // リスナーを削除する関数を返す
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline))
  }

  private async syncPendingActions(): Promise<void> {
    try {
      const pendingActions = await offlineStorage.getPendingActions()
      
      for (const action of pendingActions) {
        try {
          const response = await fetch(action.endpoint, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(action.data)
          })

          if (response.ok) {
            await offlineStorage.deletePendingAction(action.id)
            console.log('Synced pending action:', action.type)
          }
        } catch (error) {
          console.error('Failed to sync action:', action.type, error)
        }
      }
    } catch (error) {
      console.error('Failed to sync pending actions:', error)
    }
  }
}

export const networkMonitor = new NetworkMonitor()