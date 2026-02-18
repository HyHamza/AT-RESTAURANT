'use client'

import { useEffect, useRef } from 'react'
import { syncService } from '@/lib/sync-service'
import { assetCache, offlineUtils } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'

declare global {
  interface Window {
    __USER_SW_REGISTERED__?: boolean
    __USER_SW_REGISTERING__?: boolean
  }
}

// Clean up ALL old service workers before registering new one
async function cleanupOldServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
      
      if (scriptURL) {
        const isUserSW = scriptURL.includes('/sw.js') && !scriptURL.includes('/admin/');
        
        if (isUserSW) {
          // Check if it's an old version by checking cache names
          const cacheNames = await caches.keys();
          const hasOldCache = cacheNames.some(name => 
            name.includes('at-restaurant-') && 
            !name.includes('admin') &&
            (name.includes('-v1') || name.includes('-v2') || name.includes('-v3') || 
             name.includes('-v4') || name.includes('-v5') || name.includes('-v6') ||
             name.includes('-v7') || name.includes('-v8') || name.includes('-v9') || 
             name.includes('-v10') || name.includes('-v11') || name.includes('-v12'))
          );
          
          if (hasOldCache) {
            console.log('[User SW Cleanup] Unregistering old SW:', scriptURL);
            await registration.unregister();
            
            // Delete old caches
            for (const cacheName of cacheNames) {
              if (cacheName.includes('at-restaurant-') && 
                  !cacheName.includes('admin') &&
                  !cacheName.includes('-v13')) {
                console.log('[User SW Cleanup] Deleting old cache:', cacheName);
                await caches.delete(cacheName);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('[User SW Cleanup] Error during cleanup:', error);
  }
}

async function registerUserServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // CRITICAL: NEVER register user SW on admin routes
  if (window.location.pathname.startsWith('/admin')) {
    console.log('[User SW] Skipping registration - on admin route');
    return null;
  }

  if (window.__USER_SW_REGISTERED__ || window.__USER_SW_REGISTERING__) {
    console.log('[User SW] Already registered or registering');
    return navigator.serviceWorker.ready.catch(() => null);
  }

  window.__USER_SW_REGISTERING__ = true;

  try {
    // Clean up old service workers first
    await cleanupOldServiceWorkers();

    // Check if already controlled by correct SW
    if (navigator.serviceWorker.controller) {
      const controllerUrl = navigator.serviceWorker.controller.scriptURL;
      console.log('[User SW] Already controlled by:', controllerUrl);
      
      if (controllerUrl.includes('/sw.js') && !controllerUrl.includes('/admin/')) {
        window.__USER_SW_REGISTERED__ = true;
        window.__USER_SW_REGISTERING__ = false;
        return navigator.serviceWorker.ready;
      }
    }

    console.log('[User SW] Registering v13 with scope /...');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('[User SW] Registration successful, scope:', registration.scope);
    
    window.__USER_SW_REGISTERED__ = true;
    window.__USER_SW_REGISTERING__ = false;

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('[User SW] Update found');
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[User SW] New version available, activating...');
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Handle controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[User SW] Controller changed, reloading page...');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.warn('[User SW] Registration failed:', error);
    window.__USER_SW_REGISTERING__ = false;
    return null;
  }
}

// Pre-cache menu data for offline access
async function preCacheMenuData() {
  try {
    const hasCached = await offlineUtils.hasCachedData()
    if (hasCached || !navigator.onLine) return

    const [categoriesResponse, menuItemsResponse] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('menu_items').select('*, category:categories(*)').eq('is_available', true).order('sort_order')
    ])

    if (categoriesResponse.data && menuItemsResponse.data) {
      await offlineUtils.cacheMenuData(
        categoriesResponse.data,
        menuItemsResponse.data.map(item => ({
          ...item,
          category_name: item.category?.name,
          created_at: item.created_at || new Date().toISOString()
        }))
      )

      // Send to service worker
      navigator.serviceWorker.controller?.postMessage({
        type: 'CACHE_MENU_DATA',
        data: { categories: categoriesResponse.data, menuItems: menuItemsResponse.data }
      })
    }
  } catch (error) {
    console.warn('[User SW] Pre-cache failed:', error)
  }
}

export function OfflineInit() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = () => {
      console.log('[Offline Init] Starting initialization...');
      
      // Start sync service
      syncService.startAutoSync();

      // Clean expired assets
      assetCache.cleanExpiredAssets().catch(err => {
        console.warn('[Offline Init] Asset cleanup failed:', err);
      });

      // CRITICAL: Register SW after load event to never block critical rendering path
      if (document.readyState === 'complete') {
        // Already loaded
        registerUserServiceWorker()
          .then(registration => {
            if (registration) {
              console.log('[Offline Init] User SW registered successfully');
              // Pre-cache menu data after 5 seconds
              setTimeout(() => {
                preCacheMenuData().catch(err => {
                  console.warn('[Offline Init] Menu pre-cache failed:', err);
                });
              }, 5000);
            }
          })
          .catch(err => {
            console.warn('[Offline Init] SW registration error:', err);
          });
      } else {
        // Wait for load event
        window.addEventListener('load', () => {
          registerUserServiceWorker()
            .then(registration => {
              if (registration) {
                console.log('[Offline Init] User SW registered successfully');
                // Pre-cache menu data after 5 seconds
                setTimeout(() => {
                  preCacheMenuData().catch(err => {
                    console.warn('[Offline Init] Menu pre-cache failed:', err);
                  });
                }, 5000);
              }
            })
            .catch(err => {
              console.warn('[Offline Init] SW registration error:', err);
            });
        });
      }
      
      console.log('[Offline Init] Complete');
    };

    // Start immediately
    setTimeout(init, 100);

    return () => {
      syncService.stopAutoSync();
    };
  }, [])

  return null
}
