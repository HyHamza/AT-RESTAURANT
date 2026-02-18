// AT Restaurant - Admin Service Worker v3 - Strict Scope /admin/
const CACHE_VERSION = 'admin-v3';
const CACHE_NAME = `at-restaurant-admin-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-admin-runtime-${CACHE_VERSION}`;
const API_CACHE = `at-restaurant-admin-api-${CACHE_VERSION}`;
const PAGES_CACHE = `at-restaurant-admin-pages-${CACHE_VERSION}`;

const PRECACHE_PAGES = [
  '/admin/',
  '/admin/orders',
  '/admin/menu',
  '/admin/customers',
  '/admin/users'
];

const PRECACHE_ASSETS = [
  '/admin/manifest.json',
  '/assets/admin-icons/admin-icon-192.png',
  '/assets/admin-icons/admin-icon-512.png'
];

console.log('[Admin SW v3] Loading - Scope: /admin/');

// Install
self.addEventListener('install', (event) => {
  console.log('[Admin SW v3] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
          PRECACHE_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[Admin SW v3] Failed to cache ${url}:`, err.message)
            )
          )
        );
        console.log('[Admin SW v3] Pre-cache complete');
      } catch (error) {
        console.warn('[Admin SW v3] Pre-cache error:', error);
      }
      
      await self.skipWaiting();
    })()
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[Admin SW v3] Activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, PAGES_CACHE];
      
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('at-restaurant-admin-') && !validCaches.includes(name))
          .map(name => {
            console.log('[Admin SW v3] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      
      await self.clients.claim();
      console.log('[Admin SW v3] Activated - Admin routes only');
    })()
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Validate scope - this SW should ONLY see /admin routes
  if (!url.pathname.startsWith('/admin')) {
    console.error('[Admin SW v3] ERROR: Received non-admin request:', url.pathname);
    return;
  }

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip non-HTTP
  if (!url.protocol.startsWith('http')) return;

  // Skip Next.js internals
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/__nextjs_') ||
    url.searchParams.has('_rsc')
  ) {
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

  // Next.js chunks - Cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) {
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

  // NAVIGATION - Network first, NEVER block
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(PAGES_CACHE).then(cache => 
              cache.put(request, clone)
            ).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const pagesCache = await caches.open(PAGES_CACHE);
          const cached = await pagesCache.match(request);
          if (cached) return cached;
          
          const adminPage = await caches.match('/admin/');
          if (adminPage) return adminPage;
          
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Admin Offline</title>
              <style>
                body {
                  font-family: system-ui, sans-serif;
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
                }
                h1 {
                  color: #ea580c;
                  font-size: 2rem;
                  margin-bottom: 1rem;
                }
                button {
                  background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
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
                <h1>Admin Panel Offline</h1>
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

console.log('[Admin SW v3] Loaded - Strict scope: /admin/');
