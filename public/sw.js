// AT Restaurant - User Service Worker v11 - Fixed Navigation & Scope
const CACHE_VERSION = 'v11';
const CACHE_NAME = `at-restaurant-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-runtime-${CACHE_VERSION}`;
const API_CACHE = `at-restaurant-api-${CACHE_VERSION}`;
const PAGES_CACHE = `at-restaurant-pages-${CACHE_VERSION}`;

// Pre-cache essential user pages
const PRECACHE_PAGES = [
  '/',
  '/menu',
  '/order',
  '/dashboard',
  '/settings',
  '/location',
  '/order-status',
  '/offline'
];

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/assets/icons/android-chrome-192x192.png',
  '/assets/icons/android-chrome-512x512.png'
];

// Install - Pre-cache essentials
self.addEventListener('install', (event) => {
  console.log('[User SW v11] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
          PRECACHE_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[User SW v11] Failed to cache ${url}:`, err.message)
            )
          )
        );
        console.log('[User SW v11] Pre-cache complete');
      } catch (error) {
        console.warn('[User SW v11] Pre-cache error:', error);
      }
      
      await self.skipWaiting();
    })()
  );
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  console.log('[User SW v11] Activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, PAGES_CACHE];
      
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('at-restaurant-') && !name.startsWith('at-restaurant-admin-') && !validCaches.includes(name))
          .map(name => {
            console.log('[User SW v11] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      
      await self.clients.claim();
      console.log('[User SW v11] Activated - User routes only');
    })()
  );
});

// Fetch - CRITICAL: Proper scope isolation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL: NEVER intercept /admin routes - let them pass through completely
  // This SW should ONLY see non-admin routes due to scope, but double-check
  if (url.pathname.startsWith('/admin')) {
    // Don't call event.respondWith() - let the request go to network naturally
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP protocols
  if (!url.protocol.startsWith('http')) return;

  // Skip Next.js internals
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/__nextjs_') ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  // Videos - Network only
  if (request.destination === 'video' || url.pathname.match(/\.(mp4|webm|ogg)$/)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => 
        new Response(null, { status: 503 })
      )
    );
    return;
  }

  // Next.js chunks - Cache first with background update
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) {
          // Update in background
          fetch(request).then(response => {
            if (response.ok) {
              caches.open(RUNTIME_CACHE).then(cache => 
                cache.put(request, response)
              ).catch(() => {});
            }
          }).catch(() => {});
          return cached;
        }

        const response = await fetch(request);
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => 
            cache.put(request, clone)
          ).catch(() => {});
        }
        return response;
      })()
    );
    return;
  }

  // API routes - Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => 
              cache.put(request, clone)
            ).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response(
            JSON.stringify({ error: 'Offline' }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          );
        })
    );
    return;
  }

  // NAVIGATION - Network first, NEVER block
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(PAGES_CACHE).then(cache => 
              cache.put(url.pathname, clone)
            ).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const pagesCache = await caches.open(PAGES_CACHE);
          const cached = await pagesCache.match(url.pathname);
          
          if (cached) return cached;
          
          const offlinePage = await pagesCache.match('/offline');
          if (offlinePage) return offlinePage;
          
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline</title>
              <style>
                body {
                  font-family: system-ui, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #fef5f9 0%, #fff 100%);
                }
                .container {
                  text-align: center;
                  padding: 2rem;
                }
                h1 {
                  color: #e11b70;
                  font-size: 2rem;
                  margin-bottom: 1rem;
                }
                button {
                  background: #e11b70;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  font-size: 1rem;
                  border-radius: 8px;
                  cursor: pointer;
                  margin-top: 1rem;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>You're Offline</h1>
                <p>Please check your internet connection</p>
                <button onclick="window.location.reload()">Try Again</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' }, status: 503 }
          );
        })
    );
    return;
  }

  // Static assets - Stale while revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      
      const fetchPromise = fetch(request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => 
            cache.put(request, clone)
          ).catch(() => {});
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise || new Response(null, { status: 503 });
    })()
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[User SW v11] Loaded - Scope: / (excluding /admin)');
