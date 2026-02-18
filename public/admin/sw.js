// AT Restaurant - Admin Service Worker v6 - Auth-aware, Non-blocking, Cache-safe
const CACHE_VERSION = 'admin-v6';
const STATIC_CACHE = `at-restaurant-admin-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-admin-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `at-restaurant-admin-images-${CACHE_VERSION}`;

const OFFLINE_FALLBACK = '/admin/';
const CACHE_TIMEOUT = 2000; // 2 second timeout for cache operations

// CRITICAL: Routes that must NEVER be cached - always go to network
const NEVER_CACHE_PATTERNS = [
  '/admin/login',
  '/admin/logout',
  '/api/auth',
  '/api/login',
  '/api/session',
  '?redirect='
];

// Minimal precache - only manifest
const PRECACHE_URLS = ['/admin/manifest.json'];

// Install - Non-blocking, immediate activation
self.addEventListener('install', (event) => {
  console.log('[Admin SW v6] Installing...');
  
  // Skip waiting immediately - never block
  self.skipWaiting();
  
  // Precache in background, don't block on it
  event.waitUntil(
    (async () => {
      try {
        const cache = await Promise.race([
          caches.open(STATIC_CACHE),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Cache open timeout')), CACHE_TIMEOUT))
        ]);
        
        // Try to cache manifest, but don't fail if it doesn't work
        await Promise.allSettled(
          PRECACHE_URLS.map(url => 
            Promise.race([
              cache.add(url),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Cache add timeout')), CACHE_TIMEOUT))
            ]).catch(err => {
              console.warn('[Admin SW v6] Failed to precache:', url, err.message);
            })
          )
        );
        
        console.log('[Admin SW v6] Precache complete (non-blocking)');
      } catch (error) {
        console.warn('[Admin SW v6] Precache error (non-critical):', error.message);
      }
    })()
  );
});

// Activate - Clean old caches and validate integrity
self.addEventListener('activate', (event) => {
  console.log('[Admin SW v6] Activating...');
  
  // Claim clients immediately
  self.clients.claim();
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const validCaches = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
        
        // Delete old caches
        await Promise.all(
          cacheNames
            .filter(name => 
              name.startsWith('at-restaurant-admin-') && 
              !validCaches.includes(name)
            )
            .map(name => {
              console.log('[Admin SW v6] Deleting old cache:', name);
              return caches.delete(name).catch(() => {});
            })
        );
        
        // Cache integrity check - validate and clean corrupted entries
        for (const cacheName of validCaches) {
          try {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
              try {
                const response = await cache.match(request);
                
                // Validate response
                if (!response || !response.ok || response.status < 200 || response.status >= 300) {
                  console.log('[Admin SW v6] Deleting corrupted cache entry:', request.url);
                  await cache.delete(request);
                }
              } catch (error) {
                // If reading fails, delete the entry
                console.log('[Admin SW v6] Deleting unreadable cache entry:', request.url);
                await cache.delete(request).catch(() => {});
              }
            }
          } catch (error) {
            console.warn('[Admin SW v6] Cache integrity check failed for:', cacheName);
          }
        }
        
        console.log('[Admin SW v6] Activated and cache validated');
      } catch (error) {
        console.warn('[Admin SW v6] Activation error:', error);
      }
    })()
  );
});

// Safe cache match with validation
async function safeCacheMatch(request, cacheName) {
  try {
    const cache = await Promise.race([
      caches.open(cacheName),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cache open timeout')), CACHE_TIMEOUT))
    ]);
    
    const response = await Promise.race([
      cache.match(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cache match timeout')), CACHE_TIMEOUT))
    ]);
    
    // Validate response
    if (response && response.ok && response.status >= 200 && response.status < 300) {
      return response;
    }
    
    // Invalid response - delete it
    if (response) {
      cache.delete(request).catch(() => {});
    }
    
    return null;
  } catch (error) {
    console.warn('[Admin SW v6] Cache match error:', error.message);
    return null;
  }
}

// Safe cache put with timeout
async function safeCachePut(cacheName, request, response) {
  try {
    const cache = await Promise.race([
      caches.open(cacheName),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cache open timeout')), CACHE_TIMEOUT))
    ]);
    
    await Promise.race([
      cache.put(request, response),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cache put timeout')), CACHE_TIMEOUT))
    ]);
  } catch (error) {
    // Silently fail - never block on cache writes
    console.warn('[Admin SW v6] Cache put failed (non-critical):', error.message);
  }
}

// Fetch - Optimized for navigation performance with auth awareness
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Validate scope - this SW should ONLY see /admin routes
  if (!url.pathname.startsWith('/admin')) {
    console.error('[Admin SW v6] ERROR: Received non-admin request:', url.pathname);
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP protocols
  if (!url.protocol.startsWith('http')) return;

  // Skip Chrome extensions and cross-origin requests
  if (url.origin !== self.location.origin) return;

  // CRITICAL: NEVER cache auth-related routes - always bypass to network
  const requestUrl = request.url;
  if (NEVER_CACHE_PATTERNS.some(pattern => requestUrl.includes(pattern))) {
    console.log('[Admin SW v6] Auth route detected, bypassing cache:', url.pathname);
    event.respondWith(fetch(request));
    return;
  }

  // Skip Next.js internals and HMR
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/__nextjs_') ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  // NAVIGATION - NetworkFirst with ZERO cache fallback for admin HTML
  // Always hit network for admin navigation to ensure auth middleware runs
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
          
          // CRITICAL: Do NOT cache admin navigation HTML
          // This ensures every navigation goes through server auth checks
          console.log('[Admin SW v6] Admin navigation response:', response.status, url.pathname);
          
          return response;
        } catch (error) {
          console.log('[Admin SW v6] Navigation offline, serving fallback');
          
          // Only serve cached version if offline - never for auth reasons
          const cached = await safeCacheMatch(request, RUNTIME_CACHE);
          if (cached) {
            console.log('[Admin SW v6] Serving cached admin page (offline mode)');
            return cached;
          }
          
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
        const cached = await safeCacheMatch(request, RUNTIME_CACHE);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            safeCachePut(RUNTIME_CACHE, request, response.clone());
          }
          return response;
        } catch (error) {
          return new Response(null, { status: 503 });
        }
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
        const cached = await safeCacheMatch(request, IMAGE_CACHE);
        
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            safeCachePut(IMAGE_CACHE, request, response.clone());
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
          
          // Don't cache API responses for admin
          return response;
        } catch (error) {
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
      const cached = await safeCacheMatch(request, RUNTIME_CACHE);
      
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          safeCachePut(RUNTIME_CACHE, request, response.clone());
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
  
  // Handle cache clear request from app after login
  if (event.data?.type === 'CLEAR_ADMIN_CACHE') {
    console.log('[Admin SW v6] Clearing admin HTML cache after login');
    caches.open(RUNTIME_CACHE).then(cache => {
      cache.keys().then(requests => {
        requests.forEach(request => {
          const url = new URL(request.url);
          // Delete cached admin HTML pages
          if (url.pathname.startsWith('/admin') && request.mode === 'navigate') {
            cache.delete(request);
            console.log('[Admin SW v6] Deleted cached admin page:', url.pathname);
          }
        });
      });
    }).catch(err => {
      console.warn('[Admin SW v6] Cache clear error:', err);
    });
  }
});

console.log('[Admin SW v6] Loaded - Auth-aware, non-blocking, cache-safe');
