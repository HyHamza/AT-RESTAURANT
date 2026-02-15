'use client'

import { useEffect, useRef } from 'react'
import { syncService } from '@/lib/sync-service'
import { assetCache, offlineUtils } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'

// CRITICAL: Use a global flag to prevent re-registration across route changes
// This is stored on window object to persist across React re-renders
declare global {
  interface Window {
    __SW_REGISTERED__?: boolean
    __SW_REGISTERING__?: boolean
  }
}

// Optimized service worker registration - runs only once per session
// CRITICAL: This must NEVER block page load or navigation
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  // CRITICAL: Prevent duplicate registrations
  if (window.__SW_REGISTERED__ || window.__SW_REGISTERING__) {
    console.log('[SW] Already registered or registering, skipping')
    return navigator.serviceWorker.ready.catch(() => null)
  }

  window.__SW_REGISTERING__ = true

  try {
    // Check if already controlled by a service worker
    if (navigator.serviceWorker.controller) {
      console.log('[SW] Already controlled by active SW')
      window.__SW_REGISTERED__ = true
      window.__SW_REGISTERING__ = false
      return navigator.serviceWorker.ready
    }

    // Register with aggressive cache bypass
    console.log('[SW] Registering new service worker v10 (complete offline-first)...')
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // CRITICAL: Never cache sw.js
    })

    console.log('[SW] Registration successful - v10 complete offline-first')
    window.__SW_REGISTERED__ = true
    window.__SW_REGISTERING__ = false

    // Handle updates without blocking (fire-and-forget)
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      console.log('[SW] Update found, installing new version...')
      
      newWorker.addEventListener('statechange', () => {
        console.log('[SW] New worker state:', newWorker.state)
        
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SW] New version installed, activating...')
          // Auto-activate new worker immediately
          newWorker.postMessage({ type: 'SKIP_WAITING' })
        }
        
        if (newWorker.state === 'activated') {
          console.log('[SW] New version activated - reloading in 1 second...')
          // Reload after a short delay to ensure SW is fully active
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      })
    })

    // Listen for SW messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_ACTIVATED') {
        console.log('[SW] Received activation confirmation:', event.data.version)
      }
    })

    return registration
  } catch (error) {
    console.warn('[SW] Registration failed (non-critical):', error)
    window.__SW_REGISTERING__ = false
    // Don't throw - app should work without SW
    return null
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
    console.warn('[SW] Pre-cache failed:', error)
  }
}

export function OfflineInit() {
  const initialized = useRef(false)

  useEffect(() => {
    // CRITICAL: Run only once per component lifetime
    if (initialized.current) return
    initialized.current = true

    // CRITICAL: Defer ALL initialization to prevent blocking hydration
    // Use requestIdleCallback to run after browser is idle
    const init = () => {
      console.log('[Offline Init] Starting deferred initialization...')
      
      // Start sync service immediately (non-blocking)
      syncService.startAutoSync()

      // Clean expired assets (fire-and-forget, non-blocking)
      assetCache.cleanExpiredAssets().catch(err => {
        console.warn('[Offline Init] Asset cleanup failed:', err)
      })

      // Register service worker (fire-and-forget, non-blocking)
      registerServiceWorker()
        .then(registration => {
          if (registration) {
            console.log('[Offline Init] SW registered, scheduling menu pre-cache...')
            // Pre-cache menu data after a longer delay (non-blocking)
            // Wait 5 seconds to ensure app is fully loaded
            setTimeout(() => {
              preCacheMenuData().catch(err => {
                console.warn('[Offline Init] Menu pre-cache failed:', err)
              })
            }, 5000)
          } else {
            console.log('[Offline Init] SW registration skipped or failed')
          }
        })
        .catch(err => {
          console.warn('[Offline Init] SW registration error:', err)
        })
      
      console.log('[Offline Init] Initialization scheduled')
    }

    // CRITICAL: Maximum deferral to prevent ANY blocking
    // Use requestIdleCallback with a long timeout, or fallback to setTimeout
    if ('requestIdleCallback' in window) {
      // Wait until browser is completely idle, up to 5 seconds
      requestIdleCallback(init, { timeout: 5000 })
    } else {
      // Fallback: wait 1 second before initializing
      setTimeout(init, 1000)
    }

    // Cleanup
    return () => {
      syncService.stopAutoSync()
    }
  }, [])

  return null
}