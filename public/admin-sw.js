// AT Restaurant - Admin Service Worker v1
const CACHE_VERSION = 'admin-v1';
const CACHE_NAME = `at-restaurant-admin-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-admin-runtime-${CACHE_VERSION}`;
const API_CACHE = `at-restaurant-admin-api-${CACHE_VERSION}`;
const PAGES_CACHE = `at-restaurant-admin-pages-${CACHE_VERSION}`;

// Pre-cache admin pages during install
const PRECACHE_PAGES = [
  '/admin',
  '/admin/orders',
  '/admin/menu',
  '/admin/customers',
  '/admin/users',
  '/admin/pwa-test'
];

// Essential admin assets to pre-cache
const PRECACHE_ASSETS = [
  '/admin-manifest.json',
  '/assets/admin-icons/admin-icon-192.png',
  '/assets/admin-icons/admin-icon-512.png'
];

// Supabase domains to intercept when offline
const SUPABASE_DOMAINS = [
  'supabase.co',
              console.warn(`[Admin SW] Failed to cache ${url}:`, err.message)
            )
          )
        );
        console.log('[Admin SW] Precache complete');
      } catch (error) {
        console.warn('[Admin SW] Precache error:', error.message);
      }
      
      await self.skipWaiting();
      console.log('[Admin SW] Skipped waiting - activating immediately');
    })()
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Admin SW] Activating v1...');
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE];
        
        await Promise.all(
          cacheNames
            .filter(name => name.startsWith('at-restaurant-admin-') && !validCaches.includes(name))
            .map(name => {
              console.log('[Admin SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
        
        console.log('[Admin SW] Cache cleanup complete');
      } catch (error) {
        console.warn('[Admin SW] Cache cleanup error:', error.message);
      }

      await self.clients.claim();
      console.log('[Admin SW] Claimed all clients');
      
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ 
          type: 'SW_ACTIVATED', 
          version: CACHE_VERSION,
          scope: 'admin',
          timestamp: Date.now()
        });
      });
      
      console.log('[Admin SW] v1 fully activated');
    })()
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle requests within admin scope
  if (!url.pathname.startsWith('/admin')) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP protocols
  if (!url.protocol.startsWith('http')) return;

  // Skip Next.js internals
  if (
    url.pathname.startsWith('/_next/') ||
    url.searchParams.has('_rsc') ||
    url.pathname.includes('/_next/data/') ||
    url.pathname.startsWith('/__nextjs_') ||
    url.pathname.includes('/webpack-')
  ) {
    return;
  }

  // API - network first with caching
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

  // Navigation - Network first
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          return response;
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          
          // Fallback to admin dashboard
          const adminPage = await caches.match('/admin');
          if (adminPage) {
            return adminPage;
          }
          
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline - AT Restaurant Admin</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  background: linear-gradient(135deg, #fff5f0 0%, #fff 50%, #fff5f0 100%);
                  padding: 20px;
                }
                .container {
                  text-align: center;
                  max-width: 500px;
                }
                h1 {
                  color: #ea580c;
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
                  background: #ea580c;
                  color: white;
                  border: none;
                  padding: 15px 30px;
                  font-size: 1em;
                  border-radius: 8px;
                  cursor: pointer;
                  transition: background 0.2s;
                }
                button:hover {
                  background: #c2410c;
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

  // Static assets - cache first with background refresh
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      
      if (cached) {
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
        if (request.destination === 'image') {
          return new Response(
            new Blob([new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59])]),
            { status: 200, headers: { 'Content-Type': 'image/gif' } }
          );
        }
        
        return new Response(null, {
          status: 503,
          statusText: 'Service Unavailable'
        });
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
      icon: '/assets/icons/android-chrome-192x192.png',
      badge: '/assets/icons/favicon-32x32.png',
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
      return client ? client.focus() : self.clients.openWindow('/admin');
    })
  );
});

console.log('[Admin SW] v1 Loaded successfully');
