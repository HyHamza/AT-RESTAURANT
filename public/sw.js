const CACHE_NAME = 'at-restaurant-v9'
const STATIC_CACHE = 'at-restaurant-static-v9'
const DYNAMIC_CACHE = 'at-restaurant-dynamic-v9'
const IMAGE_CACHE = 'at-restaurant-images-v9'

// All pages that should be pre-cached for offline access
const PAGES_TO_CACHE = [
  '/',
  '/menu',
  '/settings', 
  '/order',
  '/order-status',
  '/login',
  '/signup',
  '/location',
  '/dashboard',
  '/admin',
  '/admin/menu',
  '/admin/orders',
  '/admin/customers',
  '/admin/users'
]

// Critical assets to pre-cache
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
]

// Install event - Pre-cache all pages and critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v9 - Pre-caching all pages...')
  
  event.waitUntil(
    Promise.all([
      // Pre-cache all pages
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('[SW] Pre-caching pages:', PAGES_TO_CACHE)
        
        // Cache pages one by one to handle failures gracefully
        const cachePromises = PAGES_TO_CACHE.map(async (url) => {
          try {
            const response = await fetch(url)
            if (response.ok) {
              await cache.put(url, response)
              console.log('[SW] ✓ Cached page:', url)
            } else {
              console.warn('[SW] ⚠ Failed to cache page (not ok):', url)
            }
          } catch (error) {
            console.warn('[SW] ⚠ Failed to cache page (error):', url, error.message)
          }
        })
        
        // Cache critical assets
        const assetPromises = ASSETS_TO_CACHE.map(async (url) => {
          try {
            const response = await fetch(url)
            if (response.ok) {
              await cache.put(url, response)
              console.log('[SW] ✓ Cached asset:', url)
            }
          } catch (error) {
            console.warn('[SW] ⚠ Failed to cache asset:', url, error.message)
          }
        })
        
        await Promise.all([...cachePromises, ...assetPromises])
        console.log('[SW] ✓ Pre-caching completed')
      }),
      self.skipWaiting()
    ])
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v9...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes('v9')) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Claim all clients
      self.clients.claim()
    ])
  )
})

// Fetch event - Cache first for everything
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Skip requests to other domains
  if (url.origin !== location.origin) {
    return
  }

  // Skip Next.js development requests
  if (url.pathname.startsWith('/_next/webpack-hmr') || 
      url.pathname.startsWith('/_next/static/chunks/webpack') ||
      url.searchParams.has('_rsc')) {
    return
  }

  event.respondWith(handleFetch(request))
})

async function handleFetch(request) {
  const url = new URL(request.url)
  
  // For navigation requests (HTML pages) - CACHE FIRST
  if (request.destination === 'document' || request.mode === 'navigate') {
    return handleNavigation(request)
  }
  
  // For static assets (JS, CSS, images) - CACHE FIRST
  if (isStaticAsset(url)) {
    return handleStaticAsset(request)
  }
  
  // For API requests - NETWORK FIRST with offline fallback
  if (url.pathname.startsWith('/api/')) {
    return handleAPIRequest(request)
  }
  
  // Default: cache first
  return cacheFirst(request)
}

async function handleNavigation(request) {
  const url = new URL(request.url)
  console.log('[SW] Navigation request for:', url.pathname)
  
  // CACHE FIRST for navigation - this ensures offline access
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    console.log('[SW] ✓ Serving cached page:', url.pathname)
    
    // Update cache in background if online
    if (navigator.onLine) {
      updateCacheInBackground(request)
    }
    
    return cachedResponse
  }
  
  // If not in cache, try network
  try {
    console.log('[SW] Page not in cache, trying network:', url.pathname)
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache the response for future offline access
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone()).catch(console.warn)
      console.log('[SW] ✓ Cached new page:', url.pathname)
      return networkResponse
    }
    
    throw new Error('Network response not ok')
    
  } catch (error) {
    console.log('[SW] ✗ Network failed for:', url.pathname)
    
    // Try to serve a similar cached page or root page
    const fallbackResponse = await getFallbackPage(url.pathname)
    if (fallbackResponse) {
      console.log('[SW] ✓ Serving fallback page for:', url.pathname)
      return fallbackResponse
    }
    
    // Last resort - return a basic error page
    return createErrorResponse(url.pathname)
  }
}

async function handleStaticAsset(request) {
  // CACHE FIRST for static assets
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheForRequest(request))
      cache.put(request, networkResponse.clone()).catch(console.warn)
    }
    
    return networkResponse
    
  } catch (error) {
    // For missing assets, return empty response instead of error
    return new Response('', { 
      status: 200, 
      statusText: 'OK',
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

async function handleAPIRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request)
    
    // Cache successful GET API responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone()).catch(console.warn)
    }
    
    return networkResponse
    
  } catch (error) {
    console.log('[SW] API request failed:', url.pathname)
    
    // Try to serve cached API response
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('[SW] ✓ Serving cached API response:', url.pathname)
      return cachedResponse
    }
    
    // Return offline response for API requests
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'This feature requires an internet connection',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function cacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone()).catch(console.warn)
    }
    
    return networkResponse
    
  } catch (error) {
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      await cache.put(request, networkResponse)
      console.log('[SW] ✓ Updated cache in background:', request.url)
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', error.message)
  }
}

async function getFallbackPage(pathname) {
  // Try to serve the root page for client-side routing
  const rootPage = await caches.match('/')
  if (rootPage) {
    return rootPage
  }
  
  // Try to serve any cached page as fallback
  const cache = await caches.open(STATIC_CACHE)
  const cachedRequests = await cache.keys()
  
  for (const cachedRequest of cachedRequests) {
    const cachedUrl = new URL(cachedRequest.url)
    if (cachedUrl.pathname !== pathname && !cachedUrl.pathname.startsWith('/_next/')) {
      const cachedResponse = await cache.match(cachedRequest)
      if (cachedResponse) {
        return cachedResponse
      }
    }
  }
  
  return null
}

function createErrorResponse(pathname) {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AT RESTAURANT</title>
        <meta name="theme-color" content="#f97316">
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f9fafb;
            color: #374151;
            text-align: center;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { max-width: 400px; }
          .logo { 
            width: 64px; 
            height: 64px; 
            background: #f97316; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin: 0 auto 24px; 
            color: white; 
            font-weight: bold; 
            font-size: 24px;
          }
          h1 { margin: 0 0 16px; color: #111827; }
          p { color: #6b7280; margin: 0 0 24px; line-height: 1.5; }
          .nav-links { margin: 24px 0; }
          .nav-links a { 
            display: inline-block; 
            margin: 8px; 
            padding: 8px 16px; 
            background: #f97316; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            font-size: 14px;
          }
          .nav-links a:hover { background: #ea580c; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">AT</div>
          <h1>AT RESTAURANT</h1>
          <p>Loading application...</p>
          <div class="nav-links">
            <a href="/">Home</a>
            <a href="/menu">Menu</a>
            <a href="/settings">Settings</a>
            <a href="/order-status">Orders</a>
          </div>
        </div>
        
        <script>
          // Redirect to home page after a short delay
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        </script>
      </body>
    </html>
  `, {
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  })
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/') || 
         /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|json)$/i.test(url.pathname)
}

function getCacheForRequest(request) {
  const url = new URL(request.url)
  
  if (url.pathname.startsWith('/_next/')) {
    return STATIC_CACHE
  }
  
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    return IMAGE_CACHE
  }
  
  return STATIC_CACHE
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOfflineOrders())
  }
})

async function syncOfflineOrders() {
  try {
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_REQUEST' })
    })
  } catch (error) {
    console.error('[SW] Sync failed:', error)
  }
}

// Handle messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'FORCE_SYNC') {
    if (self.registration.sync) {
      self.registration.sync.register('order-sync').catch(console.error)
    }
  }
})

console.log('[SW] Service worker v8 loaded')

function getCacheForRequest(request) {
  const url = new URL(request.url)
  
  if (url.pathname.startsWith('/_next/')) {
    return STATIC_CACHE
  }
  
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    return IMAGE_CACHE
  }
  
  if (url.pathname.startsWith('/api/')) {
    return DYNAMIC_CACHE
  }
  
  return STATIC_CACHE
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOfflineOrders())
  }
})

async function syncOfflineOrders() {
  try {
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_REQUEST' })
    })
  } catch (error) {
    console.error('[SW] Sync failed:', error)
  }
}

// Handle messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'FORCE_SYNC') {
    if (self.registration.sync) {
      self.registration.sync.register('order-sync').catch(console.error)
    }
  }
})

console.log('[SW] Service worker v6 loaded')
function getCacheForRequest(request) {
  const url = new URL(request.url)
  
  if (url.pathname.startsWith('/_next/')) {
    return STATIC_CACHE
  }
  
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    return IMAGE_CACHE
  }
  
  return STATIC_CACHE
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOfflineOrders())
  }
})

async function syncOfflineOrders() {
  try {
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_REQUEST' })
    })
  } catch (error) {
    console.error('[SW] Sync failed:', error)
  }
}

// Handle messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'FORCE_SYNC') {
    if (self.registration.sync) {
      self.registration.sync.register('order-sync').catch(console.error)
    }
  }
  
  if (event.data && event.data.type === 'CACHE_MENU_DATA') {
    // Cache menu data when received from the app
    cacheMenuData(event.data.data).catch(console.error)
  }
})

// Cache menu data from the application
async function cacheMenuData(data) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE)
    
    // Cache categories
    if (data.categories) {
      await cache.put('/api/categories', new Response(JSON.stringify(data.categories), {
        headers: { 'Content-Type': 'application/json' }
      }))
    }
    
    // Cache menu items
    if (data.menuItems) {
      await cache.put('/api/menu-items', new Response(JSON.stringify(data.menuItems), {
        headers: { 'Content-Type': 'application/json' }
      }))
    }
    
    console.log('[SW] ✓ Menu data cached successfully')
  } catch (error) {
    console.error('[SW] Failed to cache menu data:', error)
  }
}

console.log('[SW] Service worker v9 loaded - Full offline support enabled')