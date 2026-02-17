// AT Restaurant - Service Worker v10 - Complete Offline-First with Pre-caching
const CACHE_VERSION = 'v10';
const CACHE_NAME = `at-restaurant-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-runtime-${CACHE_VERSION}`;
const API_CACHE = `at-restaurant-api-${CACHE_VERSION}`;
const PAGES_CACHE = `at-restaurant-pages-${CACHE_VERSION}`;

// CRITICAL: Pre-cache ALL public pages and essential assets during install
const PRECACHE_PAGES = [
  '/',
  '/menu',
  '/order',
  '/dashboard',
  '/settings',
  '/location',
  '/order-status',
  '/privacy',
  '/terms',
  '/offline',
  '/login',
  '/signup'
];

// Essential static assets to pre-cache
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/assets/icons/favicon.ico',
  '/assets/icons/favicon.svg',
  '/assets/icons/favicon-16x16.png',
  '/assets/icons/favicon-32x32.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/android-chrome-192x192.png',
  '/assets/icons/android-chrome-512x512.png'
];

// Supabase domains to intercept when offline
const SUPABASE_DOMAINS = [
  'supabase.co',
  'supabase.com'
];

// Install event - Pre-cache ALL pages and assets
self.addEventListener('install', (event) => {
  console.log('[SW v10] Installing - Pre-caching all pages...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const pagesCache = await caches.open(PAGES_CACHE);
        
        // Pre-cache static assets
        console.log('[SW v10] Pre-caching static assets...');
        await Promise.allSettled(
          PRECACHE_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[SW v10] Failed to cache asset ${url}:`, err.message)
            )
          )
        );
        
        // Pre-cache ALL pages
        console.log('[SW v10] Pre-caching all pages...');
        const pagePromises = PRECACHE_PAGES.map(async (url) => {
          try {
            const response = await fetch(url, {
              credentials: 'same-origin',
              headers: {
                'Accept': 'text/html'
              }
            });
            
            if (response.ok) {
              await pagesCache.put(url, response);
              console.log(`[SW v10] ✓ Cached page: ${url}`);
            } else {
              console.warn(`[SW v10] ✗ Failed to cache ${url}: ${response.status}`);
            }
          } catch (err) {
            console.warn(`[SW v10] ✗ Error caching ${url}:`, err.message);
          }
        });
        
        await Promise.allSettled(pagePromises);
        
        console.log('[SW v10] Pre-cache complete - All pages cached!');
      } catch (error) {
        console.error('[SW v10] Pre-cache error:', error);
      }
      
      // Skip waiting to activate immediately
      await self.skipWaiting();
      console.log('[SW v10] Skipped waiting - activating immediately');
    })()
  );
});

// Activate event - Clean old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW v10] Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        // Delete old caches
        const cacheNames = await caches.keys();
        const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, PAGES_CACHE];
        
        await Promise.all(
          cacheNames
            .filter(name => !validCaches.includes(name))
            .map(name => {
              console.log('[SW v10] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
        
        console.log('[SW v10] Cache cleanup complete');
      } catch (error) {
        console.warn('[SW v10] Cache cleanup error:', error);
      }

      // Claim all clients immediately
      await self.clients.claim();
      console.log('[SW v10] Claimed all clients');
      
      // Notify clients
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ 
          type: 'SW_ACTIVATED', 
          version: CACHE_VERSION,
          precachedPages: PRECACHE_PAGES.length,
          timestamp: Date.now()
        });
      });
      
      console.log('[SW v10] Fully activated - Offline-first ready!');
    })()
  );
});

// Helper: Check if offline
function isOffline() {
  return !self.navigator.onLine;
}

// Helper: Check if Supabase request
function isSupabaseRequest(url) {
  return SUPABASE_DOMAINS.some(domain => url.hostname.includes(domain));
}

// Helper: Create offline response for Supabase auth
function createOfflineAuthResponse() {
  return new Response(
    JSON.stringify({
      error: 'offline',
      message: 'Authentication unavailable offline',
      offline: true
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline': 'true'
      }
    }
  );
}

// Fetch event - Comprehensive offline handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL: This SW should NEVER see /admin/ routes due to scope
  // If we do, it means scope configuration is wrong
  if (url.pathname.startsWith('/admin')) {
    console.error('[User SW v10] ERROR: Received /admin route:', url.pathname);
    console.error('[User SW v10] Admin routes should be handled by admin SW with scope /admin/');
    return; // Don't handle it
  }

  // CRITICAL: Ignore admin resources
  if (url.pathname === '/admin-manifest.json' || 
      url.pathname === '/admin/manifest.json' ||
      url.pathname.includes('admin-sw.js') ||
      url.pathname.includes('/admin/sw.js')) {
    console.log('[User SW v10] Ignoring admin resources');
    return;
  }

  // Skip non-GET requests (except for offline Supabase handling)
  if (request.method !== 'GET' && !isSupabaseRequest(url)) {
    return;
  }

  // Skip non-HTTP protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // CRITICAL: Intercept Supabase requests when offline
  if (isSupabaseRequest(url)) {
    event.respondWith(
      (async () => {
        // If offline, return cached response or offline response
        if (isOffline()) {
          console.log('[SW v10] Blocking Supabase request (offline):', url.pathname);
          
          // Try to return cached response
          const cached = await caches.match(request);
          if (cached) {
            console.log('[SW v10] Returning cached Supabase response');
            return cached;
          }
          
          // Return offline response
          return createOfflineAuthResponse();
        }
        
        // Online - try network with timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(request, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // Cache successful responses
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => 
              cache.put(request, responseClone)
            ).catch(() => {});
          }
          
          return response;
        } catch (error) {
          console.log('[SW v10] Supabase request failed:', error.message);
          
          // Try cache
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          
          // Return offline response
          return createOfflineAuthResponse();
        }
      })()
    );
    return;
  }

  // Skip Next.js internal requests (let them pass through)
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/__nextjs_') ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  // VIDEOS: Always network-only, never cache
  if (request.destination === 'video' || url.pathname.match(/\.(mp4|webm|ogg)$/)) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request, { cache: 'no-store' });
        } catch (error) {
          return new Response(null, { 
            status: 503, 
            statusText: 'Video unavailable offline' 
          });
        }
      })()
    );
    return;
  }

  // Next.js chunks and static files: Cache-first with network fallback
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        // Try cache first
        const cached = await caches.match(request);
        if (cached) {
          console.log('[SW v10] Serving cached chunk:', url.pathname);
          
          // Update cache in background
          if (!isOffline()) {
            fetch(request).then(response => {
              if (response.ok) {
                caches.open(RUNTIME_CACHE).then(cache => 
                  cache.put(request, response)
                ).catch(() => {});
              }
            }).catch(() => {});
          }
          
          return cached;
        }

        // Not in cache - fetch from network
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
          console.warn('[SW v10] Chunk failed:', url.pathname);
          
          // Return empty response to prevent errors
          if (request.destination === 'script') {
            return new Response('console.log("[SW] Offline chunk");', {
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

  // External images: CORS handling
  if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request, { mode: 'no-cors' });
        } catch (error) {
          // Return 1x1 transparent GIF
          return new Response(
            new Blob([new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59])]),
            { status: 200, headers: { 'Content-Type': 'image/gif' } }
          );
        }
      })()
    );
    return;
  }

  // API routes: Network-first with cache fallback
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

  // NAVIGATION: Cache-first for pre-cached pages, network-first for others
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Check if page is pre-cached
        const pagesCache = await caches.open(PAGES_CACHE);
        const cachedPage = await pagesCache.match(url.pathname);
        
        if (cachedPage) {
          console.log('[SW v10] Serving pre-cached page:', url.pathname);
          
          // Update cache in background if online
          if (!isOffline()) {
            fetch(request).then(response => {
              if (response.ok) {
                pagesCache.put(url.pathname, response).catch(() => {});
              }
            }).catch(() => {});
          }
          
          return cachedPage;
        }

        // Not pre-cached - try network first
        try {
          const response = await fetch(request);
          
          // Cache successful navigation responses
          if (response.ok) {
            const responseClone = response.clone();
            pagesCache.put(url.pathname, responseClone).catch(() => {});
          }
          
          return response;
        } catch (error) {
          console.log('[SW v10] Navigation offline:', url.pathname);
          
          // Try any cached version
          const runtimeCache = await caches.open(RUNTIME_CACHE);
          const runtimeCached = await runtimeCache.match(request);
          if (runtimeCached) {
            return runtimeCached;
          }
          
          // Serve offline page
          const offlinePage = await pagesCache.match('/offline');
          if (offlinePage) {
            return offlinePage;
          }
          
          // Inline offline page
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
                  font-size: 4em;
                  margin-bottom: 20px;
                }
                .cached-pages {
                  margin-top: 30px;
                  padding: 20px;
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .cached-pages h2 {
                  font-size: 1.2em;
                  color: #333;
                  margin-bottom: 15px;
                }
                .cached-pages a {
                  display: block;
                  padding: 10px;
                  margin: 5px 0;
                  background: #fef5f9;
                  color: #e11b70;
                  text-decoration: none;
                  border-radius: 6px;
                  transition: background 0.2s;
                }
                .cached-pages a:hover {
                  background: #fce4f0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">📡</div>
                <h1>You're Offline</h1>
                <p>No internet connection detected. You can still browse cached pages below.</p>
                <button onclick="window.location.reload()">Try Again</button>
                
                <div class="cached-pages">
                  <h2>Available Offline Pages</h2>
                  <a href="/">Home</a>
                  <a href="/menu">Menu</a>
                  <a href="/order">Order</a>
                  <a href="/dashboard">Dashboard</a>
                  <a href="/settings">Settings</a>
                </div>
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

  // Static assets: Cache-first with stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      
      if (cached) {
        // Update cache in background if online
        if (!isOffline()) {
          fetch(request).then(response => {
            if (response.ok && url.origin === self.location.origin) {
              caches.open(RUNTIME_CACHE).then(cache => 
                cache.put(request, response)
              ).catch(() => {});
            }
          }).catch(() => {});
        }
        
        return cached;
      }

      // Not in cache - fetch from network
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

  if (event.data?.type === 'GET_CACHED_PAGES') {
    caches.open(PAGES_CACHE).then(cache => {
      cache.keys().then(requests => {
        const urls = requests.map(req => req.url);
        event.ports[0]?.postMessage({ cachedPages: urls });
      });
    });
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(names => 
      Promise.all(names.map(name => caches.delete(name)))
    ).then(() => {
      event.ports[0]?.postMessage({ success: true });
    }).catch(() => {
      event.ports[0]?.postMessage({ success: false });
    });
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => 
          client.postMessage({ type: 'SYNC_ORDERS', timestamp: Date.now() })
        );
      })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'AT Restaurant', {
      body: data.body || 'New notification',
      icon: '/assets/icons/android-chrome-192x192.png',
      badge: '/assets/icons/favicon-32x32.png',
      data: data.data || {}
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const client = clients.find(c => c.url === '/' && 'focus' in c);
      return client ? client.focus() : self.clients.openWindow('/');
    })
  );
});

console.log('[SW v10] Loaded - Complete offline-first with pre-caching enabled');
