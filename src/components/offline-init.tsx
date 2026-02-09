'use client'

import { useEffect } from 'react'
import { syncService } from '@/lib/sync-service'
import { assetCache, offlineUtils } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'

// Global flag to prevent multiple simultaneous registrations across tabs
const SW_REGISTRATION_KEY = '__sw_registering__'
const SW_REGISTRATION_TIMEOUT = 15000 // 15 seconds

// Safe service worker registration with concurrency control
async function registerServiceWorkerSafely(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[OfflineInit] Service Worker not supported')
    return null
  }

  try {
    // Check if another tab is currently registering
    const registering = sessionStorage.getItem(SW_REGISTRATION_KEY)
    if (registering) {
      const timestamp = parseInt(registering, 10)
      const elapsed = Date.now() - timestamp
      
      // If registration started less than 15s ago, wait for it
      if (elapsed < SW_REGISTRATION_TIMEOUT) {
        console.log('[OfflineInit] Another tab is registering SW, waiting...')
        
        // Wait for existing registration to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Check if SW is now ready
        if (navigator.serviceWorker.controller) {
          console.log('[OfflineInit] Service Worker already active')
          return navigator.serviceWorker.ready
        }
      }
    }

    // Mark that we're registering
    sessionStorage.setItem(SW_REGISTRATION_KEY, Date.now().toString())

    try {
      // Register with timeout
      const registrationPromise = navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Registration timeout')), 10000)
      )

      const registration = await Promise.race([registrationPromise, timeoutPromise])
      console.log('[OfflineInit] Service Worker registered')

      // Don't wait for ready - let it activate in background
      // This prevents blocking the page load
      navigator.serviceWorker.ready.then(() => {
        console.log('[OfflineInit] Service Worker ready')
        sessionStorage.removeItem(SW_REGISTRATION_KEY)
      }).catch(() => {
        sessionStorage.removeItem(SW_REGISTRATION_KEY)
      })

      return registration
    } finally {
      // Clear registration flag after a delay
      setTimeout(() => {
        sessionStorage.removeItem(SW_REGISTRATION_KEY)
      }, 3000)
    }
  } catch (error) {
    console.warn('[OfflineInit] Service Worker registration failed:', error)
    sessionStorage.removeItem(SW_REGISTRATION_KEY)
    return null
  }
}

export function OfflineInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize offline functionality
    const initOffline = async () => {
      try {
        // Start sync service (non-blocking)
        syncService.startAutoSync()
        
        // Clean expired assets (non-blocking)
        assetCache.cleanExpiredAssets().catch(() => {})
        
        // Register service worker
        const registration = await registerServiceWorkerSafely()
        
        if (registration) {
          // Pre-cache menu data (non-blocking, in background)
          setTimeout(() => {
            preCacheMenuData().catch(() => {})
          }, 1000)
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[OfflineInit] New service worker available')
                }
              })
            }
          })
        }
      } catch (error) {
        console.error('[OfflineInit] Initialization failed:', error)
      }
    }

    // Pre-cache menu data for offline access
    const preCacheMenuData = async () => {
      try {
        const hasCached = await offlineUtils.hasCachedData()
        if (hasCached) return
        
        if (!navigator.onLine) return

        // Fetch categories
        const categoriesResponse = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')

        // Fetch menu items
        const menuItemsResponse = await supabase
          .from('menu_items')
          .select(`
            *,
            category:categories(*)
          `)
          .eq('is_available', true)
          .order('sort_order')

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
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CACHE_MENU_DATA',
              data: {
                categories: categoriesResponse.data,
                menuItems: menuItemsResponse.data
              }
            })
          }
        }
      } catch (error) {
        console.warn('[OfflineInit] Pre-cache failed:', error)
      }
    }

    // Start initialization immediately
    initOffline()

    // Cleanup
    return () => {
      try {
        syncService.stopAutoSync()
      } catch {}
    }
  }, [])

  return null
}

  // This component doesn't render anything
  return null
}