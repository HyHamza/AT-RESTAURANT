// AT Restaurant - User Service Worker v12 - Performance Optimized
const CACHE_VERSION = 'user-v12';
const STATIC_CACHE = `at-restaurant-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `at-restaurant-images-${CACHE_VERSION}`;

const OFFLINE_FALLBACK = '/offline';

// Minimal precache - only offline page
const PRECACHE_URLS = [
  OFFLINE_FALLBACK,
  '/manifest.json'
];

// Install - Minimal precache, immediate activation
self.addEventListener('install', (event) => {
  console.log('[User SW v12] Installing...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[User SW v12] Precache failed:', err);
      });
      await self.skipWaiting();
      console.log('[User SW v12] Installed and skipped waiting');
    })()
  );
});

// Activate - Clean old caches, immediate claim
self.addEventListener('activate', (event) => {
  console.log('[User SW v12] Activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const validCaches = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
      
      await Promise.all(
        cacheNames
          .filter(name => 
            name.startsWith('at-restaurant-') && 
            !name.startsWith('at-restaurant-admin-') && 
            !validCaches.includes(name)
          )
          .map(name => {
            console.log('[User SW v12] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      
      await self.clients.claim();
      console.log('[User SW v12] Activated and claimed clients');
    })()
  );
});

// Fetch - Optimized for navigation performance
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL: Never intercept admin routes
  if (url.pathname.startsWith('/admin')) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP protocols
  if (!url.protocol.startsWith('http')) return;

  // Skip Chrome extensions and cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internals and HMR
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/__nextjs_') ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  // NAVIGATION - NetworkFirst with 3s timeout
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Network first with timeout
          const networkPromise = fetch(request);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Network timeout')), 3000)
          );
          
          const response = await Promise.race([networkPromise, timeoutPromise]);
          
          // Cache successful navigation responses
          if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone()).catch(() => {});
          }
          
          return response;
        } catch (error) {
          console.log('[User SW v12] Navigation offline, serving fallback');
          
          // Try cached version
          const cached = await caches.match(request);
          if (cached) return cached;
          
          // Serve offline page
          const offlinePage = await caches.match(OFFLINE_FALLBACK);
          if (offlinePage) return offlinePage;
          
          // Final fallback
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline - AT Restaurant</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
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
                  max-width: 400px;
                }
                h1 {
                  color: #e11b70;
                  font-size: 2rem;
                  margin-bottom: 1rem;
                }
                p {
                  color: #666;
                  margin-bottom: 1.5rem;
                }
                button {
                  background: #e11b70;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  font-size: 1rem;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                }
                button:hover {
                  background: #c91660;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>You're Offline</h1>
                <p>Please check your internet connection and try again.</p>
                <button onclick="window.location.reload()">Retry</button>
              </div>
            </body>
            </html>`,
            { 
              headers: { 'Content-Type': 'text/html' }, 
              status: 503 
            }
          );
        }
      })()
    );
    return;
  }

  // /_next/static/ - CacheFirst with 365 day expiration
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      })()
    );
    return;
  }

  // /_next/image and images - StaleWhileRevalidate
  if (url.pathname.startsWith('/_next/image') || 
      request.destination === 'image' ||
      /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            const cache = caches.open(IMAGE_CACHE);
            cache.then(c => c.put(request, response.clone())).catch(() => {});
          }
          return response;
        }).catch(() => null);

        return cached || fetchPromise || new Response(null, { status: 503 });
      })()
    );
    return;
  }

  // /api/ routes - NetworkFirst with 10s timeout
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const networkPromise = fetch(request);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API timeout')), 10000)
          );
          
          const response = await Promise.race([networkPromise, timeoutPromise]);
          
          if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone()).catch(() => {});
          }
          
          return response;
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          
          return new Response(
            JSON.stringify({ error: 'Offline', offline: true }),
            { 
              headers: { 'Content-Type': 'application/json' }, 
              status: 503 
            }
          );
        }
      })()
    );
    return;
  }

  // All other requests - StaleWhileRevalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          const cache = caches.open(RUNTIME_CACHE);
          cache.then(c => c.put(request, response.clone())).catch(() => {});
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

console.log('[User SW v12] Loaded - Scope: / (excluding /admin)');
