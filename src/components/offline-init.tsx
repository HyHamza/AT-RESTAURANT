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
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  // CRITICAL: Prevent duplicate registrations
  if (window.__SW_REGISTERED__ || window.__SW_REGISTERING__) {
    console.log('[SW] Already registered or registering')
    return navigator.serviceWorker.ready.catch(() => null)
  }

  window.__SW_REGISTERING__ = true

  try {
    // Check if already controlled by a service worker
    if (navigator.serviceWorker.controller) {
      console.log('[SW] Already controlled')
      window.__SW_REGISTERED__ = true
      window.__SW_REGISTERING__ = false
      return navigator.serviceWorker.ready
    }

    // Register with aggressive cache bypass
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // CRITICAL: Never cache sw.js
    })

    console.log('[SW] Registered successfully')
    window.__SW_REGISTERED__ = true
    window.__SW_REGISTERING__ = false

    // Handle updates without blocking
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SW] Update available')
          // Auto-activate new worker
          newWorker.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading...')
      window.location.reload()
    })

    return registration
  } catch (error) {
    console.warn('[SW] Registration failed:', error)
    window.__SW_REGISTERING__ = false
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

    // Use requestIdleCallback to defer initialization until after hydration
    const init = () => {
      // Start sync service immediately (non-blocking)
      syncService.startAutoSync()

      // Clean expired assets (non-blocking)
      assetCache.cleanExpiredAssets().catch(() => {})

      // Register service worker (non-blocking)
      registerServiceWorker().then(registration => {
        if (registration) {
          // Pre-cache menu data after a delay (non-blocking)
          setTimeout(() => preCacheMenuData(), 2000)
        }
      })
    }

    // CRITICAL: Defer to prevent blocking hydration
    if ('requestIdleCallback' in window) {
      requestIdleCallback(init, { timeout: 2000 })
    } else {
      setTimeout(init, 100)
    }

    // Cleanup
    return () => {
      syncService.stopAutoSync()
    }
  }, [])

  return null
}