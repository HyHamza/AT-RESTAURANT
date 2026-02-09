// AT Restaurant - Service Worker v7
const CACHE_VERSION = 'v7'
const CACHE_NAME = `at-restaurant-${CACHE_VERSION}`
const RUNTIME_CACHE = `at-restaurant-runtime-${CACHE_VERSION}`
const API_CACHE = `at-restaurant-api-${CACHE_VERSION}`
const VIDEO_CACHE = `at-restaurant-video-${CACHE_VERSION}`

// Minimal precache - only critical offline assets
const PRECACHE_ASSETS = [
  '/offline',
  '/favicon.ico'
]

// Install event - skip waiting immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v7...')
  
  event.waitUntil(
    (async () => {
      try {
        // Precache critical assets only
        const cache = await caches.open(CACHE_NAME)
        await Promise.allSettled(
          PRECACHE_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[SW] Failed to cache ${url}:`, err.message)
            )
          )
        )
        console.log('[SW] Precache complete')
      } catch (error) {
        console.warn('[SW] Precache error:', error.message)
      }
      
      // CRITICAL: Skip waiting immediately to prevent multiple SW versions
      await self.skipWaiting()
      console.log('[SW] Skipped waiting')
    })()
  )
})

// Activate event - claim all clients immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v7...')
  
  event.waitUntil(
    (async () => {
      try {
        // Delete old caches
        const cacheNames = await caches.keys()
        const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, VIDEO_CACHE]
        
        await Promise.all(
          cacheNames
            .filter(name => !validCaches.includes(name))
            .map(name => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      } catch (error) {
        console.warn('[SW] Cache cleanup error:', error.message)
      }

      // CRITICAL: Claim all clients immediately
      await self.clients.claim()
      console.log('[SW] Claimed all clients')
      
      // Notify all clients that SW is ready
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach(client => {
        client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION })
      })
    })()
  )
})

// Fetch event - CRITICAL: Must ALWAYS return a response, never hang
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip non-HTTP protocols
  if (!url.protocol.startsWith('http')) return

  // CRITICAL: Let Next.js internals pass through WITHOUT interception
  // Don't call event.respondWith() for these - let browser handle them
  if (
    url.pathname.startsWith('/_next/') ||
    url.searchParams.has('_rsc') ||
    url.pathname.includes('/_next/data/') ||
    url.pathname.startsWith('/__nextjs_') ||
    url.pathname.includes('/webpack-')
  ) {
    // Don't intercept - let it pass through to network
    return
  }

  // External images - CORS handling with proper fallback
  if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          // Try with no-cors mode first
          const response = await fetch(request, { mode: 'no-cors' })
          return response
        } catch (error) {
          console.log('[SW] External image failed, returning placeholder:', url.href)
          // Return placeholder image
          return new Response(
            new Blob([new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59])]),
            { status: 200, headers: { 'Content-Type': 'image/gif' } }
          )
        }
      })()
    )
    return
  }
  // Video - CRITICAL: Network first with background caching to prevent hangs
  // Large videos (16MB) should NEVER block the response
  if (request.destination === 'video' || url.pathname.match(/\.(mp4|webm)$/)) {
    event.respondWith(
      (async () => {
        try {
          // Check cache first (instant if available)
          const cached = await caches.match(request)
          if (cached) {
            console.log('[SW] Video served from cache:', url.pathname)
            return cached
          }

          // Fetch from network (don't wait for caching)
          console.log('[SW] Fetching video from network:', url.pathname)
          const response = await fetch(request)
          
          // CRITICAL: Only cache full responses (200), not partial (206)
          // Cache API doesn't support partial responses (HTTP 206)
          if (response.status === 200 && url.origin === self.location.origin) {
            // Fire-and-forget caching (no await, no blocking)
            const responseClone = response.clone()
            caches.open(VIDEO_CACHE).then(cache => {
              console.log('[SW] Caching video in background:', url.pathname)
              return cache.put(request, responseClone)
            }).then(() => {
              console.log('[SW] Video cached successfully:', url.pathname)
            }).catch(err => {
              console.warn('[SW] Video cache failed:', err.message)
            })
          } else if (response.status === 206) {
            console.log('[SW] Skipping cache for partial response (206):', url.pathname)
          }
          
          // Return response immediately (don't wait for cache)
          return response
        } catch (error) {
          console.warn('[SW] Video fetch failed:', error)
          // Try to serve from cache if offline
          const cached = await caches.match(request)
          if (cached) {
            console.log('[SW] Serving cached video after network failure:', url.pathname)
            return cached
          }
          // Return a proper error response
          return new Response(null, { 
            status: 503, 
            statusText: 'Video unavailable offline' 
          })
        }
      })()
    )
    return
  }

  // API - network first with background caching (non-blocking)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          
          // Cache in background (fire-and-forget)
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(API_CACHE).then(cache => 
              cache.put(request, responseClone)
            ).catch(() => {})
          }
          
          return response
        } catch (error) {
          // Fallback to cache if offline
          const cached = await caches.match(request)
          return cached || new Response(
            JSON.stringify({ error: 'Offline', offline: true }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          )
        }
      })()
    )
    return
  }

  // Navigation - Network first, NEVER cache HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Always fetch fresh HTML from network
          const response = await fetch(request)
          return response
        } catch (error) {
          console.log('[SW] Navigation offline, trying cache:', url.pathname)
          
          // Try to serve from cache first
          const cached = await caches.match(request)
          if (cached) {
            console.log('[SW] Serving cached page:', url.pathname)
            return cached
          }
          
          // Try offline page
          const offlinePage = await caches.match('/offline')
          if (offlinePage) {
            console.log('[SW] Serving offline page')
            return offlinePage
          }
          
          // Last resort: inline offline page
          console.log('[SW] Serving inline offline page')
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline - AT Restaurant</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  background: linear-gradient(135deg, #fef5f9 0%, #fff 50%, #fef5f9 100%);
                  padding: 20px;
                }
                .container {
                  text-align: center;
                  max-width: 500px;
                }
                h1 {
                  color: #e11b70;
                  font-size: 3em;
                  margin-bottom: 20px;
                }
                p {
                  color: #666;
                  font-size: 1.2em;
                  line-height: 1.6;
                  margin-bottom: 30px;
                }
                button {
                  background: #e11b70;
                  color: white;
                  border: none;
                  padding: 15px 30px;
                  font-size: 1em;
                  border-radius: 8px;
                  cursor: pointer;
                  transition: background 0.2s;
                }
                button:hover {
                  background: #c01560;
                }
                .icon {
                  font-size: 5em;
                  margin-bottom: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">📡</div>
                <h1>You're Offline</h1>
                <p>It looks like you've lost your internet connection. Please check your connection and try again.</p>
                <button onclick="window.location.reload()">Try Again</button>
              </div>
            </body>
            </html>`,
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

  // Static assets - cache first with background refresh (stale-while-revalidate)
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      
      // Return cached immediately if available
      if (cached) {
        // Refresh cache in background (fire-and-forget)
        fetch(request).then(response => {
          if (response.ok && url.origin === self.location.origin) {
            caches.open(RUNTIME_CACHE).then(cache => 
              cache.put(request, response)
            ).catch(() => {})
          }
        }).catch(() => {})
        
        return cached
      }

      // Not in cache, fetch from network
      try {
        const response = await fetch(request)
        
        // Cache in background (fire-and-forget)
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then(cache => 
            cache.put(request, responseClone)
          ).catch(() => {})
        }
        
        return response
      } catch (error) {
        console.log('[SW] Static asset failed:', url.pathname, error.message)
        
        // Fallback for images (including external images with CORS errors)
        if (request.destination === 'image') {
          console.log('[SW] Returning placeholder image')
          return new Response(
            new Blob([new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59])]),
            { status: 200, headers: { 'Content-Type': 'image/gif' } }
          )
        }
        
        // For JS/CSS chunks, return empty response to prevent errors
        if (request.destination === 'script') {
          console.log('[SW] Returning empty script for offline chunk')
          return new Response('console.log("[SW] Offline chunk skipped");', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
          })
        }
        
        if (request.destination === 'style') {
          console.log('[SW] Returning empty style for offline chunk')
          return new Response('/* Offline chunk skipped */', {
            status: 200,
            headers: { 'Content-Type': 'text/css' }
          })
        }
        
        // For other assets, return a proper error response (don't throw!)
        console.log('[SW] Returning 503 for failed asset')
        return new Response(null, {
          status: 503,
          statusText: 'Service Unavailable'
        })
      }
    })()
  )
})

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'CACHE_MENU_DATA') {
    caches.open(API_CACHE).then(cache => {
      cache.put(
        new Request('/api/menu'),
        new Response(JSON.stringify(event.data.data), {
          headers: { 'Content-Type': 'application/json' }
        })
      ).catch(() => {})
    }).catch(() => {})
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(names => 
      Promise.all(names.map(name => caches.delete(name)))
    ).then(() => {
      event.ports[0]?.postMessage({ success: true })
    }).catch(() => {
      event.ports[0]?.postMessage({ success: false })
    })
  }
})

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => 
          client.postMessage({ type: 'SYNC_ORDERS', timestamp: Date.now() })
        )
      })
    )
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'AT Restaurant', {
      body: data.body || 'New notification',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data || {}
    })
  )
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const client = clients.find(c => c.url === '/' && 'focus' in c)
      return client ? client.focus() : self.clients.openWindow('/')
    })
  )
})

console.log('[SW] Loaded v7')
