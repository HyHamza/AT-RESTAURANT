// AT Restaurant - Service Worker
const CACHE_VERSION = 'v2'
const CACHE_NAME = `at-restaurant-${CACHE_VERSION}`
const RUNTIME_CACHE = `at-restaurant-runtime-${CACHE_VERSION}`
const API_CACHE = `at-restaurant-api-${CACHE_VERSION}`
const VIDEO_CACHE = `at-restaurant-video-${CACHE_VERSION}`

// CRITICAL: Do NOT cache navigation routes during install
// Caching '/' causes circular dependency when SW intercepts its own fetch
const PRECACHE_ASSETS = [
  '/offline',
  '/favicon.ico'
]

// Track installation state
let isInstalling = false
let isActivated = false

// Install event - minimal, non-blocking setup
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  isInstalling = true
  
  event.waitUntil(
    (async () => {
      try {
        // Test if cache is available (handles private mode)
        try {
          const testCache = await caches.open('__test__')
          await testCache.put(
            new Request('/test'),
            new Response('test', { headers: { 'Content-Type': 'text/plain' } })
          )
          await caches.delete('__test__')
        } catch (error) {
          console.warn('[Service Worker] Cache not available:', error)
          // Continue anyway - SW can still work without cache
        }

        // Pre-cache only non-navigation assets
        // Do NOT cache '/' or any HTML pages to avoid circular fetch
        try {
          const cache = await caches.open(CACHE_NAME)
          console.log('[Service Worker] Precaching assets')
          
          // Cache each asset individually, ignore failures
          await Promise.allSettled(
            PRECACHE_ASSETS.map(asset =>
              cache.add(asset).catch(err => {
                console.warn(`[Service Worker] Failed to cache ${asset}:`, err)
              })
            )
          )
        } catch (error) {
          console.warn('[Service Worker] Precache failed:', error)
        }

        console.log('[Service Worker] Installation complete')
      } catch (error) {
        console.error('[Service Worker] Installation error:', error)
      } finally {
        isInstalling = false
        // CRITICAL: Skip waiting immediately to take control
        // This prevents multiple SW versions from conflicting
        await self.skipWaiting()
      }
    })()
  )
})

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        try {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames
              .filter((name) => 
                name !== CACHE_NAME && 
                name !== RUNTIME_CACHE && 
                name !== API_CACHE && 
                name !== VIDEO_CACHE
              )
              .map((name) => {
                console.log('[Service Worker] Deleting old cache:', name)
                return caches.delete(name).catch(() => null)
              })
          )
        } catch (error) {
          console.warn('[Service Worker] Cache cleanup failed:', error)
        }

        // CRITICAL: Claim clients immediately
        // This ensures all tabs are controlled by this SW version
        await self.clients.claim()
        isActivated = true
        
        console.log('[Service Worker] Activated and claimed clients')

        // Background cache video (non-blocking, don't wait)
        caches.open(VIDEO_CACHE).then(cache => {
          cache.add('/assets/videos/hero.mp4').catch(() => {
            console.log('[Service Worker] Video cache skipped')
          })
        }).catch(() => {})
        
      } catch (error) {
        console.error('[Service Worker] Activation error:', error)
        // Always claim clients even on error
        await self.clients.claim()
        isActivated = true
      }
    })()
  )
})

// Fetch event - CRITICAL: Must never block or hang
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Skip non-GET requests immediately
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  // Skip non-HTTP protocols
  if (!url.protocol.startsWith('http')) {
    return
  }

  // CRITICAL: Skip Next.js internal requests to avoid hydration issues
  if (url.pathname.includes('/_next/data/') || 
      url.searchParams.has('_rsc') ||
      url.pathname.startsWith('/_next/static/')) {
    return
  }

  // CRITICAL: During installation, pass through all requests
  // This prevents circular dependency when SW tries to cache '/'
  if (isInstalling) {
    return
  }

  // Handle external images with CORS
  if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request, { mode: 'no-cors' })
        .catch(() => {
          // Return transparent 1x1 GIF for failed images
          return new Response(
            new Blob([new Uint8Array([
              0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
              0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21,
              0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
              0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
              0x01, 0x00, 0x3B
            ])], { type: 'image/gif' }),
            { status: 200, headers: { 'Content-Type': 'image/gif' } }
          )
        })
    )
    return
  }

  // Video requests - cache first with timeout
  if (request.destination === 'video' || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm')) {
    event.respondWith(
      (async () => {
        try {
          // Try cache first with timeout
          const cachePromise = caches.match(request)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cache timeout')), 1000)
          )
          
          const cachedResponse = await Promise.race([cachePromise, timeoutPromise])
            .catch(() => null)

          if (cachedResponse) {
            console.log('[Service Worker] Serving video from cache:', url.pathname)
            return cachedResponse
          }

          // Fetch from network
          console.log('[Service Worker] Fetching video from network:', url.pathname)
          const response = await fetch(request)
          
          // Cache successful responses (non-blocking)
          if (response.ok && url.origin === self.location.origin) {
            const responseClone = response.clone()
            caches.open(VIDEO_CACHE).then(cache => {
              cache.put(request, responseClone).catch(() => {})
            }).catch(() => {})
          }
          
          return response
        } catch (error) {
          console.error('[Service Worker] Video fetch failed:', error)
          return new Response(null, { status: 503, statusText: 'Video unavailable' })
        }
      })()
    )
    return
  }

  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          
          // Cache successful responses (non-blocking)
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(API_CACHE).then(cache => {
              cache.put(request, responseClone).catch(() => {})
            }).catch(() => {})
          }
          
          return response
        } catch (error) {
          // Try cache fallback with timeout
          try {
            const cachePromise = caches.match(request)
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Cache timeout')), 500)
            )
            
            const cachedResponse = await Promise.race([cachePromise, timeoutPromise])
            
            if (cachedResponse) {
              return cachedResponse
            }
          } catch {}
          
          // Return offline response
          return new Response(
            JSON.stringify({ error: 'Offline', offline: true }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          )
        }
      })()
    )
    return
  }

  // CRITICAL: Navigation requests - NETWORK ONLY, never cache HTML
  // Caching HTML causes stale page issues and circular dependencies
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Always fetch fresh HTML from network
          const response = await fetch(request)
          return response
        } catch (error) {
          // Only on network failure, show offline page
          try {
            const cachePromise = caches.match('/offline')
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Cache timeout')), 500)
            )
            
            const offlinePage = await Promise.race([cachePromise, timeoutPromise])
            
            if (offlinePage) {
              return offlinePage
            }
          } catch {}
          
          // Final fallback
          return new Response(
            '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
            {
              headers: { 'Content-Type': 'text/html' },
              status: 503
            }
          )
        }
      })()
    )
    return
  }

  // Static assets - cache first with network fallback
  event.respondWith(
    (async () => {
      try {
        // Try cache first with timeout
        const cachePromise = caches.match(request)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cache timeout')), 1000)
        )
        
        const cachedResponse = await Promise.race([cachePromise, timeoutPromise])
          .catch(() => null)

        if (cachedResponse) {
          return cachedResponse
        }

        // Fetch from network
        const response = await fetch(request)
        
        // Cache successful same-origin responses (non-blocking)
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone).catch(() => {})
          }).catch(() => {})
        }
        
        return response
      } catch (error) {
        // Return transparent GIF for failed images
        if (request.destination === 'image') {
          return new Response(
            new Blob([new Uint8Array([
              0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
              0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21,
              0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
              0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
              0x01, 0x00, 0x3B
            ])], { type: 'image/gif' }),
            { status: 200, headers: { 'Content-Type': 'image/gif' } }
          )
        }
        
        // Try cache one more time for other resources
        try {
          const fallback = await caches.match(request)
          if (fallback) return fallback
        } catch {}
        
        throw error
      }
    })()
  )
})

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'CACHE_MENU_DATA') {
    const { data } = event.data
    caches.open(API_CACHE).then(cache => {
      cache.put(
        new Request('/api/menu'),
        new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        })
      ).catch(() => {})
    }).catch(() => {})
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => caches.delete(name))
      )
    }).then(() => {
      event.ports[0]?.postMessage({ success: true })
    }).catch(() => {
      event.ports[0]?.postMessage({ success: false })
    })
  }
})

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_ORDERS',
            timestamp: Date.now()
          })
        })
      })
    )
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'AT Restaurant'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.data || {}
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})

console.log('[Service Worker] Loaded')
