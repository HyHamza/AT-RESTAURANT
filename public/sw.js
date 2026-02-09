// AT Restaurant - Service Worker (Minimal Safe Version)
const CACHE_VERSION = 'v3'
const CACHE_NAME = `at-restaurant-${CACHE_VERSION}`
const VIDEO_CACHE = `at-restaurant-video-${CACHE_VERSION}`

// Install event - minimal precaching
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v3...')
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v3...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('at-restaurant-') && name !== CACHE_NAME && name !== VIDEO_CACHE)
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients')
        return self.clients.claim()
      })
  )
})

// Fetch event - ONLY handle specific resources
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // ONLY intercept GET requests from same origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return // Let browser handle it
  }

  // ONLY handle videos - everything else goes to network
  if (request.destination === 'video' || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Video from cache:', url.pathname)
            return cachedResponse
          }

          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone()
                caches.open(VIDEO_CACHE)
                  .then((cache) => cache.put(request, responseClone))
                  .catch(() => {}) // Ignore cache errors
              }
              return response
            })
            .catch(() => {
              // Video failed to load
              return new Response(null, { status: 503 })
            })
        })
    )
    return
  }

  // Let everything else (HTML, JS, CSS, API, images) go directly to network
  // Don't intercept at all
})

console.log('[Service Worker] Loaded v3 - Minimal safe version')
