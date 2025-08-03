// Service Worker for Sakura Club PWA
const CACHE_NAME = 'sakura-club-v1'
const STATIC_CACHE_NAME = 'sakura-club-static-v1'
const DYNAMIC_CACHE_NAME = 'sakura-club-dynamic-v1'

// キャッシュするリソース
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/matches',
  '/messages',
  '/experiences',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  // Add more static assets as needed
]

// キャッシュしないURL（API呼び出しなど）
const CACHE_BLACKLIST = [
  '/api/auth/',
  '/api/notifications',
  '/api/messages/',
]

// インストール時の処理
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .catch(err => {
        console.error('[SW] Failed to cache static assets:', err)
      })
  )
  
  // 新しいService Workerを即座にアクティブにする
  self.skipWaiting()
})

// アクティベート時の処理
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 古いキャッシュを削除
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Removing old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        // Service Workerがすべてのクライアントを制御するようにする
        return self.clients.claim()
      })
  )
})

// フェッチ時の処理（キャッシュ戦略）
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // HTMLページのリクエスト
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // ネットワークから取得できた場合はキャッシュに保存
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE_NAME)
            .then(cache => cache.put(request, responseClone))
          return response
        })
        .catch(() => {
          // ネットワークエラーの場合はキャッシュから取得
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse
              }
              // フォールバックページを返す
              return caches.match('/')
            })
        })
    )
    return
  }

  // APIリクエストの処理
  if (url.pathname.startsWith('/api/')) {
    // ブラックリストに含まれるAPIはキャッシュしない
    const isBlacklisted = CACHE_BLACKLIST.some(pattern => 
      url.pathname.startsWith(pattern)
    )
    
    if (isBlacklisted) {
      // ネットワークファーストで、キャッシュなし
      event.respondWith(fetch(request))
      return
    }

    // 読み取り専用APIはキャッシュファーストで処理
    if (request.method === 'GET') {
      event.respondWith(
        caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              // バックグラウンドでアップデート
              fetch(request)
                .then(response => {
                  const responseClone = response.clone()
                  caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.put(request, responseClone))
                })
                .catch(() => {}) // エラーは無視
              
              return cachedResponse
            }
            
            // キャッシュにない場合はネットワークから取得
            return fetch(request)
              .then(response => {
                if (response.status === 200) {
                  const responseClone = response.clone()
                  caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.put(request, responseClone))
                }
                return response
              })
          })
      )
      return
    }
  }

  // 静的リソース（CSS、JS、画像など）
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse
          }
          
          return fetch(request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone()
                caches.open(STATIC_CACHE_NAME)
                  .then(cache => cache.put(request, responseClone))
              }
              return response
            })
        })
    )
    return
  }

  // その他のリクエストはネットワークファースト
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  )
})

// プッシュ通知の処理
self.addEventListener('push', event => {
  console.log('[SW] Push notification received')
  
  const options = {
    body: 'Sakura Clubで新しい通知があります',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'sakura-club-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'アプリを開く',
        icon: '/icons/action-open.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icons/action-close.png'
      }
    ]
  }

  if (event.data) {
    try {
      const data = event.data.json()
      options.body = data.message || options.body
      options.title = data.title || 'Sakura Club'
      if (data.url) {
        options.data = { url: data.url }
      }
    } catch (err) {
      console.error('[SW] Error parsing push data:', err)
    }
  }

  event.waitUntil(
    self.registration.showNotification('Sakura Club', options)
  )
})

// 通知クリック時の処理
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked')
  
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // 既に開いているタブがあるかチェック
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen)
            return client.focus()
          }
        }
        
        // 新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// バックグラウンド同期
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // オフライン中に蓄積されたデータを同期
      syncOfflineData()
    )
  }
})

// オフラインデータの同期処理
async function syncOfflineData() {
  try {
    // IndexedDBからオフライン中に保存されたデータを取得
    // 実装は後続のオフライン対応で追加
    console.log('[SW] Syncing offline data...')
  } catch (error) {
    console.error('[SW] Failed to sync offline data:', error)
  }
}

// エラーハンドリング
self.addEventListener('error', event => {
  console.error('[SW] Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
})