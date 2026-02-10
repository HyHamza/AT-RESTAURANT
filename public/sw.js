// AT Restaurant - Service Worker v9 - NEVER CACHE VIDEOS
const CACHE_VERSION = 'v9';
const CACHE_NAME = `at-restaurant-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-runtime-${CACHE_VERSION}`;
const API_CACHE = `at-restaurant-api-${CACHE_VERSION}`;

// Minimal precache - only critical offline assets (NO VIDEO!)
const PRECACHE_ASSETS = [
  '/offline',
  '/favicon.ico'
];

// Install event - skip waiting immediately, NO video caching
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v9 - Video-Free...');
  
  event.waitUntil(
    (async () => {
      try {
        // Precache critical assets only (NO VIDEO!)
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
          PRECACHE_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[SW] Failed to cache ${url}:`, err.message)
            )
          )
        );
        console.log('[SW] Precache complete (video excluded)');
      } catch (error) {
        console.warn('[SW] Precache error:', error.message);
      }
      
      // CRITICAL: Skip waiting immediately
      await self.skipWaiting();
      console.log('[SW] Skipped waiting - activating immediately');
    })()
  );
});

// Activate event - claim all clients immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v9 - Video-Free...');
  
  event.waitUntil(
    (async () => {
      try {
        // Delete old caches (including any old video caches)
        const cacheNames = await caches.keys();
        const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE];
        
        await Promise.all(
          cacheNames
            .filter(name => !validCaches.includes(name))
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
        
        console.log('[SW] Cache cleanup complete (all video caches removed)');
      } catch (error) {
        console.warn('[SW] Cache cleanup error:', error.message);
      }

      // CRITICAL: Claim all clients immediately
      await self.clients.claim();
      console.log('[SW] Claimed all clients - ready to serve');
      
      // Notify all clients that SW is ready
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ 
          type: 'SW_ACTIVATED', 
          version: CACHE_VERSION,
          timestamp: Date.now()
        });
      });
      
      console.log('[SW] v9 fully activated and operational');
    })()
  );
});

// Fetch event - CRITICAL: Must ALWAYS return a response, never hang
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP protocols
  if (!url.protocol.startsWith('http')) return;

  // CRITICAL: Let Next.js internals pass through WITHOUT interception
  if (
    url.pathname.startsWith('/_next/') ||
    url.searchParams.has('_rsc') ||
    url.pathname.includes('/_next/data/') ||
    url.pathname.startsWith('/__nextjs_') ||
    url.pathname.includes('/webpack-')
  ) {
    return; // Don't intercept
  }

  // CRITICAL: Videos - ALWAYS network-only, NEVER cache
  // This prevents the 16MB video from blocking page loads
  if (request.destination === 'video' || url.pathname.match(/\.(mp4|webm|ogg)$/)) {
    event.respondWith(
      (async () => {
        try {
          console.log('[SW] Fetching video from network (no cache):', url.pathname);
          // Direct network fetch with no-store to prevent any caching
          const response = await fetch(request, { cache: 'no-store' });
          console.log('[SW] Video fetched successfully:', url.pathname);
          return response;
        } catch (error) {
          console.log('[SW] Video network failed:', error.message);
          // Return proper error response (don't throw!)
          return new Response(null, { 
            status: 503, 
            statusText: 'Video unavailable offline' 
          });
        }
      })()
    );
    return;
  }

  // External images - CORS handling with proper fallback
  if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, { mode: 'no-cors' });
          return response;
        } catch (error) {
          console.log('[SW] External image failed, returning placeholder');
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

  // API - network first with background caching (non-blocking)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          
          // Cache in background (fire-and-forget)
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => 
              cache.put(request, responseClone)
            ).catch(() => {});
          }
          
          return response;
        } catch (error) {
          // Fallback to cache if offline
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

  // Navigation - Network first, NEVER cache HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Always fetch fresh HTML from network
          const response = await fetch(request);
          return response;
        } catch (error) {
          console.log('[SW] Navigation offline, trying cache:', url.pathname);
          
          // Try to serve from cache first
          const cached = await caches.match(request);
          if (cached) {
            console.log('[SW] Serving cached page:', url.pathname);
            return cached;
          }
          
          // Try offline page
          const offlinePage = await caches.match('/offline');
          if (offlinePage) {
            console.log('[SW] Serving offline page');
            return offlinePage;
          }
          
          // Last resort: inline offline page
          console.log('[SW] Serving inline offline page');
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
          );
        }
      })()
    );
    return;
  }

  // Static assets - cache first with background refresh (stale-while-revalidate)
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      
      // Return cached immediately if available
      if (cached) {
        // Refresh cache in background (fire-and-forget)
        fetch(request).then(response => {
          if (response.ok && url.origin === self.location.origin) {
            caches.open(RUNTIME_CACHE).then(cache => 
              cache.put(request, response)
            ).catch(() => {});
          }
        }).catch(() => {});
        
        return cached;
      }

      // Not in cache, fetch from network
      try {
        const response = await fetch(request);
        
        // Cache in background (fire-and-forget)
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => 
            cache.put(request, responseClone)
          ).catch(() => {});
        }
        
        return response;
      } catch (error) {
        console.log('[SW] Static asset failed:', url.pathname, error.message);
        
        // Fallback for images
        if (request.destination === 'image') {
          console.log('[SW] Returning placeholder image');
          return new Response(
            new Blob([new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59])]),
            { status: 200, headers: { 'Content-Type': 'image/gif' } }
          );
        }
        
        // For JS/CSS chunks, return empty response to prevent errors
        if (request.destination === 'script') {
          return new Response('console.log("[SW] Offline chunk skipped");', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
        
        if (request.destination === 'style') {
          return new Response('/* Offline chunk skipped */', {
            status: 200,
            headers: { 'Content-Type': 'text/css' }
          });
        }
        
        // For other assets, return a proper error response
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

  if (event.data?.type === 'CACHE_MENU_DATA') {
    caches.open(API_CACHE).then(cache => {
      cache.put(
        new Request('/api/menu'),
        new Response(JSON.stringify(event.data.data), {
          headers: { 'Content-Type': 'application/json' }
        })
      ).catch(() => {});
    }).catch(() => {});
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
      icon: '/favicon.ico',
      badge: '/favicon.ico',
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

console.log('[SW] v9 Video-Free - Loaded successfully');
