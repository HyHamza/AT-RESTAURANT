// AT Restaurant - User Service Worker v14 - Fast Navigation
const CACHE_VERSION = 'user-v14';
const STATIC_CACHE = `at-restaurant-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `at-restaurant-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `at-restaurant-images-${CACHE_VERSION}`;

const OFFLINE_FALLBACK = '/offline';
const CACHE_TIMEOUT = 1000; // 1 second timeout for cache operations

// Minimal precache - only offline page
const PRECACHE_URLS = [OFFLINE_FALLBACK];

// Install - Non-blocking, immediate activation
self.addEventListener('install', (event) => {
  console.log('[User SW v14] Installing...');
  
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
        
        await Promise.allSettled(
          PRECACHE_URLS.map(url => 
            Promise.race([
              cache.add(url),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Cache add timeout')), CACHE_TIMEOUT))
            ]).catch(err => {
              console.warn('[User SW v14] Failed to precache:', url, err.message);
            })
          )
        );
        
        console.log('[User SW v14] Precache complete (non-blocking)');
      } catch (error) {
        console.warn('[User SW v14] Precache error (non-critical):', error.message);
      }
    })()
  );
});

// Activate - Clean old caches and validate integrity
self.addEventListener('activate', (event) => {
  console.log('[User SW v14] Activating...');
  
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
              name.startsWith('at-restaurant-') && 
              !name.startsWith('at-restaurant-admin-') && 
              !validCaches.includes(name)
            )
            .map(name => {
              console.log('[User SW v14] Deleting old cache:', name);
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
                  console.log('[User SW v14] Deleting corrupted cache entry:', request.url);
                  await cache.delete(request);
                }
              } catch (error) {
                // If reading fails, delete the entry
                console.log('[User SW v14] Deleting unreadable cache entry:', request.url);
                await cache.delete(request).catch(() => {});
              }
            }
          } catch (error) {
            console.warn('[User SW v14] Cache integrity check failed for:', cacheName);
          }
        }
        
        console.log('[User SW v14] Activated and cache validated');
      } catch (error) {
        console.warn('[User SW v14] Activation error:', error);
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
    return null;
  }
}

// Safe cache put with timeout - non-blocking
function safeCachePut(cacheName, request, response) {
  // Fire and forget - never wait for cache writes
  Promise.race([
    caches.open(cacheName),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Cache open timeout')), CACHE_TIMEOUT))
  ]).then(cache => {
    return Promise.race([
      cache.put(request, response),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cache put timeout')), CACHE_TIMEOUT))
    ]);
  }).catch(() => {
    // Silently fail - never block
  });
}

// Fetch - Optimized for fast navigation
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

  // NAVIGATION - Network ONLY, no cache delays
  // CRITICAL: Direct navigation (typing URL, clicking link) must be instant
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Pure network fetch - no cache lookups that cause delays
          const response = await fetch(request);
          
          // Cache in background (fire and forget - non-blocking)
          if (response.ok) {
            safeCachePut(RUNTIME_CACHE, request, response.clone());
          }
          
          return response;
        } catch (error) {
          // Only on network failure, try cache
          const cached = await safeCacheMatch(request, RUNTIME_CACHE);
          if (cached) return cached;
          
          // Serve offline page
          const offlinePage = await safeCacheMatch(OFFLINE_FALLBACK, STATIC_CACHE);
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

  // /_next/static/ - CacheFirst (these are immutable versioned assets)
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

  // /api/ routes - Network only (no caching for API calls)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => 
        new Response(
          JSON.stringify({ error: 'Offline', offline: true }),
          { 
            headers: { 'Content-Type': 'application/json' }, 
            status: 503 
          }
        )
      )
    );
    return;
  }

  // All other requests - Network first, fast fallback
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          safeCachePut(RUNTIME_CACHE, request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await safeCacheMatch(request, RUNTIME_CACHE);
        return cached || new Response(null, { status: 503 });
      }
    })()
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[User SW v14] Loaded - Fast navigation, no blocking cache');
