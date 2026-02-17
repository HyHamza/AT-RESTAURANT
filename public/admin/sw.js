// AT Restaurant - Admin Service Worker v2 (Strict Scope Isolation)
// CRITICAL: This SW ONLY controls /admin/ routes (with trailing slash)
const CACHE_VERSION = 'admin-v2';
const CACHE_NAME = `at-restaurant-admin-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-admin-runtime-${CACHE_VERSION}`;
const API_CACHE = `at-restaurant-admin-api-${CACHE_VERSION}`;
const PAGES_CACHE = `at-restaurant-admin-pages-${CACHE_VERSION}`;

// Pre-cache admin pages during install
const PRECACHE_PAGES = [
  '/admin/',
  '/admin/orders',
  '/admin/menu',
  '/admin/customers',
  '/admin/users',
  '/admin/pwa-test'
];

// Essential admin assets to pre-cache
const PRECACHE_ASSETS = [
  '/admin/manifest.json',
  '/assets/admin-icons/admin-icon-192.png',
  '/assets/admin-icons/admin-icon-512.png'
];

console.log('[Admin SW v2] Loading with strict scope: /admin/');

// Install event - Pre-cache admin resources
self.addEventListener('install', (event) => {
  console.log('[Admin SW v2] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const pagesCache = await caches.open(PAGES_CACHE);
        
        // Pre-cache static assets
        console.log('[Admin SW v2] Pre-caching admin assets...');
        await Promise.allSettled(
          PRECACHE_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[Admin SW v2] Failed to cache ${url}:`, err.message)
            )
          )
        );

        // Pre-cache admin pages
        console.log('[Admin SW v2] Pre-caching admin pages...');
        await Promise.allSettled(
          PRECACHE_PAGES.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return pagesCache.put(url, response);
              }
            }).catch(err => 
              console.warn(`[Admin SW v2] Failed to cache ${url}:`, err.message)
            )
          )
        );
        
        console.log('[Admin SW v2] Pre-cache complete');
      } catch (error) {
        console.warn('[Admin SW v2] Pre-cache error:', error.message);
      }
      
      await self.skipWaiting();
      console.log('[Admin SW v2] Skipped waiting - activating immediately');
    })()
  );
});

// Activate event - Clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Admin SW v2] Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, PAGES_CACHE];
        
        await Promise.all(
          cacheNames
            .filter(name => name.startsWith('at-restaurant-admin-') && !validCaches.includes(name))
            .map(name => {
              console.log('[Admin SW v2] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
        
        console.log('[Admin SW v2] Cache cleanup complete');
      } catch (error) {
        console.warn('[Admin SW v2] Cache cleanup error:', error.message);
      }

      await self.clients.claim();
      console.log('[Admin SW v2] Claimed all clients in /admin/ scope');
      
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ 
          type: 'SW_ACTIVATED', 
          version: CACHE_VERSION,
          scope: '/admin/',
          timestamp: Date.now()
        });
      });
      
      console.log('[Admin SW v2] Fully activated for /admin/ scope');
    })()
  );
});

// Fetch event - Handle admin requests only
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL VALIDATION: This SW should ONLY see /admin/ requests
  // If we see non-admin requests, something is wrong with scope
  if (!url.pathname.startsWith('/admin')) {
    console.error('[Admin SW v2] ERROR: Received non-admin request:', url.pathname);
    console.error('[Admin SW v2] This indicates scope misconfiguration!');
    return; // Don't handle it
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

  // API routes - Network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => 
              cache.put(request, responseClone)
            ).catch(() => {});
          }
          
          return response;
        } catch (error) {
          const cached = await caches.match(request);
          return cached || new Response(
            JSON.stringify({ error: 'Offline', offline: true }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          );
        }
      })()
    );
    return;
  }

  // Next.js chunks - Cache first with network fallback
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) {
          // Update cache in background
          fetch(request).then(response => {
            if (response.ok) {
              caches.open(RUNTIME_CACHE).then(cache => 
                cache.put(request, response)
              ).catch(() => {});
            }
          }).catch(() => {});
          
          return cached;
        }

        try {
          const response = await fetch(request);
          
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => 
              cache.put(request, responseClone)
            ).catch(() => {});
          }
          
          return response;
        } catch (error) {
          // Return empty response for scripts/styles
          if (request.destination === 'script') {
            return new Response('console.log("[Admin SW] Offline chunk");', {
              status: 200,
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
          
          if (request.destination === 'style') {
            return new Response('/* Offline */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' }
            });
          }
          
          return new Response(null, { status: 503 });
        }
      })()
    );
    return;
  }

  // Navigation - Network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const response = await fetch(request);
          
          // Cache successful navigation
          if (response.ok) {
            const responseClone = response.clone();
            const pagesCache = await caches.open(PAGES_CACHE);
            pagesCache.put(request, responseClone).catch(() => {});
          }
          
          return response;
        } catch (error) {
          // Try cache on network failure
          const pagesCache = await caches.open(PAGES_CACHE);
          const cached = await pagesCache.match(request);
          if (cached) {
            return cached;
          }
          
          // Fallback to admin dashboard
          const adminPage = await caches.match('/admin/');
          if (adminPage) {
            return adminPage;
          }
          
          // Inline offline page
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline - Admin Panel</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
                  padding: 20px;
                }
                .container {
                  text-align: center;
                  max-width: 500px;
                  background: white;
                  padding: 40px;
                  border-radius: 16px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                h1 {
                  color: #ea580c;
                  font-size: 2.5em;
                  margin-bottom: 20px;
                }
                p {
                  color: #666;
                  font-size: 1.1em;
                  line-height: 1.6;
                  margin-bottom: 30px;
                }
                button {
                  background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                  color: white;
                  border: none;
                  padding: 15px 30px;
                  font-size: 1em;
                  border-radius: 8px;
                  cursor: pointer;
                  transition: transform 0.2s;
                  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
                }
                button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 16px rgba(234, 88, 12, 0.4);
                }
                .icon {
                  font-size: 4em;
                  margin-bottom: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">📡</div>
                <h1>Admin Panel Offline</h1>
                <p>You're currently offline. Please check your internet connection to access the admin panel.</p>
                <button onclick="window.location.reload()">Try Again</button>
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

  // Static assets - Cache first with stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      
      if (cached) {
        // Update cache in background
        fetch(request).then(response => {
          if (response.ok && url.origin === self.location.origin) {
            caches.open(RUNTIME_CACHE).then(cache => 
              cache.put(request, response)
            ).catch(() => {});
          }
        }).catch(() => {});
        
        return cached;
      }

      try {
        const response = await fetch(request);
        
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => 
            cache.put(request, responseClone)
          ).catch(() => {});
        }
        
        return response;
      } catch (error) {
        // Fallback for images
        if (request.destination === 'image') {
          return new Response(
            new Blob([new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59])]),
            { status: 200, headers: { 'Content-Type': 'image/gif' } }
          );
        }
        
        return new Response(null, { status: 503 });
      }
    })()
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(names => 
      Promise.all(
        names
          .filter(name => name.startsWith('at-restaurant-admin-'))
          .map(name => caches.delete(name))
      )
    ).then(() => {
      event.ports[0]?.postMessage({ success: true });
    }).catch(() => {
      event.ports[0]?.postMessage({ success: false });
    });
  }
});

// Push notifications for admin
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'AT Restaurant Admin', {
      body: data.body || 'New notification',
      icon: '/assets/admin-icons/admin-icon-192.png',
      badge: '/assets/admin-icons/admin-icon-192.png',
      tag: 'admin-notification',
      data: data.data || {}
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const client = clients.find(c => c.url.includes('/admin') && 'focus' in c);
      return client ? client.focus() : self.clients.openWindow('/admin/');
    })
  );
});

console.log('[Admin SW v2] Loaded - Strict scope isolation enabled for /admin/');
