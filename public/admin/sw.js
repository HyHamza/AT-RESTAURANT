// AT Restaurant - Admin Service Worker v4 - Performance Optimized
const CACHE_VERSION = 'admin-v4';
const STATIC_CACHE = `at-restaurant-admin-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-admin-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `at-restaurant-admin-images-${CACHE_VERSION}`;

const OFFLINE_FALLBACK = '/admin/';

// Minimal precache
const PRECACHE_URLS = [
  '/admin/manifest.json'
];

// Install - Minimal precache, immediate activation
self.addEventListener('install', (event) => {
  console.log('[Admin SW v4] Installing...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[Admin SW v4] Precache failed:', err);
      });
      await self.skipWaiting();
      console.log('[Admin SW v4] Installed and skipped waiting');
    })()
  );
});

// Activate - Clean old caches, immediate claim
self.addEventListener('activate', (event) => {
  console.log('[Admin SW v4] Activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const validCaches = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
      
      await Promise.all(
        cacheNames
          .filter(name => 
            name.startsWith('at-restaurant-admin-') && 
            !validCaches.includes(name)
          )
          .map(name => {
            console.log('[Admin SW v4] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      
      await self.clients.claim();
      console.log('[Admin SW v4] Activated and claimed clients');
    })()
  );
});

// Fetch - Optimized for navigation performance
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Validate scope - this SW should ONLY see /admin routes
  if (!url.pathname.startsWith('/admin')) {
    console.error('[Admin SW v4] ERROR: Received non-admin request:', url.pathname);
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
          console.log('[Admin SW v4] Navigation offline, serving fallback');
          
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
              <title>Admin Offline - AT Restaurant</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
                }
                .container {
                  text-align: center;
                  padding: 2rem;
                  background: white;
                  border-radius: 16px;
                  max-width: 400px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                h1 {
                  color: #ea580c;
                  font-size: 2rem;
                  margin-bottom: 1rem;
                }
                p {
                  color: #666;
                  margin-bottom: 1.5rem;
                }
                button {
                  background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  font-size: 1rem;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                }
                button:hover {
                  opacity: 0.9;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Admin Panel Offline</h1>
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

console.log('[Admin SW v4] Loaded - Strict scope: /admin/');
