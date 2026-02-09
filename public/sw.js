// AT Restaurant - Service Worker
const CACHE_NAME = 'at-restaurant-v1'
const RUNTIME_CACHE = 'at-restaurant-runtime-v1'
const API_CACHE = 'at-restaurant-api-v1'
const VIDEO_CACHE = 'at-restaurant-video-v1'

// Assets to cache on install - only essential files
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/favicon.ico'
]

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching essential assets')
        return cache.addAll(PRECACHE_ASSETS).catch((error) => {
          console.error('[Service Worker] Precache failed:', error)
          // Don't fail installation if precache fails
          return Promise.resolve()
        })
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error)
      })
  )
})

// Background cache update for video (non-blocking)
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  
  // Clean up old caches
  const cleanup = caches.keys().then((cacheNames) => {
    return Promise.all(
      cacheNames
        .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== API_CACHE && name !== VIDEO_CACHE)
        .map((name) => {
          console.log('[Service Worker] Deleting old cache:', name)
          return caches.delete(name)
        })
    )
  })

  // Background cache video (non-blocking)
  const cacheVideo = caches.open(VIDEO_CACHE).then((cache) => {
    console.log('[Service Worker] Background caching video...')
    return cache.add('/assets/videos/hero.mp4').catch((error) => {
      console.log('[Service Worker] Video cache skipped (will cache on first request):', error.message)
    })
  })

  event.waitUntil(
    Promise.all([cleanup, cacheVideo])
      .then(() => self.clients.claim())
      .catch((error) => {
        console.error('[Service Worker] Activation error:', error)
        return self.clients.claim() // Claim clients even if caching fails
      })
  )
})

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Skip external images with CORS issues - let them fail naturally
  if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request, { mode: 'no-cors' })
        .then((response) => response)
        .catch(() => {
          // Return transparent 1x1 pixel for failed external images
          return new Response(
            new Blob([new Uint8Array([
              0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
              0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21,
              0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
              0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
              0x01, 0x00, 0x3B
            ])], { type: 'image/gif' }),
            { status: 200, statusText: 'OK', headers: { 'Content-Type': 'image/gif' } }
          )
        })
    )
    return
  }

  // Video requests - cache first, network fallback
  if (request.destination === 'video' || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving video from cache:', url.pathname)
          return cachedResponse
        }

        console.log('[Service Worker] Fetching video from network:', url.pathname)
        return fetch(request).then((response) => {
          // Only cache successful video responses from same origin
          if (response.ok && url.origin === self.location.origin) {
            const responseClone = response.clone()
            caches.open(VIDEO_CACHE).then((cache) => {
              console.log('[Service Worker] Caching video:', url.pathname)
              cache.put(request, responseClone)
            }).catch((error) => {
              console.error('[Service Worker] Failed to cache video:', error)
            })
          }
          return response
        }).catch((error) => {
          console.error('[Service Worker] Failed to fetch video:', error)
          // Return empty video response for offline
          return new Response(null, {
            status: 503,
            statusText: 'Video unavailable offline'
          })
        })
      })
    )
    return
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone)
            }).catch(() => {
              // Silently fail cache writes
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Return offline response for API calls
            return new Response(
              JSON.stringify({ error: 'Offline', offline: true }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            )
          })
        })
    )
    return
  }

  // Page requests - network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page loads
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            }).catch(() => {
              // Silently fail cache writes
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache or offline page
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            return caches.match('/offline')
          })
        })
    )
    return
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request).then((response) => {
        // Only cache same-origin responses
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone)
          }).catch(() => {
            // Silently fail cache writes
          })
        }
        return response
      }).catch((error) => {
        // Return a transparent 1x1 pixel for failed images
        if (request.destination === 'image') {
          return new Response(
            new Blob([new Uint8Array([
              0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
              0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21,
              0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
              0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
              0x01, 0x00, 0x3B
            ])], { type: 'image/gif' }),
            { status: 200, statusText: 'OK', headers: { 'Content-Type': 'image/gif' } }
          )
        }
        
        // For scripts and other resources, check cache one more time
        return caches.match(request).then((fallbackResponse) => {
          if (fallbackResponse) {
            return fallbackResponse
          }
          // Let it fail naturally for non-critical resources
          throw error
        })
      })
    })
  )
})

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'CACHE_MENU_DATA') {
    // Cache menu data for offline access
    const { data } = event.data
    caches.open(API_CACHE).then((cache) => {
      cache.put(
        new Request('/api/menu'),
        new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    // Clear all caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      )
    }).then(() => {
      event.ports[0]?.postMessage({ success: true })
    })
  }
})

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      // Notify client to handle sync
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_ORDERS',
            timestamp: Date.now()
          })
        })
      })
    )
  }
})

// Push notifications (for future use)
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
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})

console.log('[Service Worker] Loaded successfully')
