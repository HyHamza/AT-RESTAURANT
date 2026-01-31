'use client'

import { useEffect } from 'react'
import { syncService } from '@/lib/sync-service'
import { assetCache, offlineUtils } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'

export function OfflineInit() {
  useEffect(() => {
    // Initialize offline functionality
    const initOffline = async () => {
      try {
        // Start sync service
        syncService.startAutoSync()
        
        // Clean expired assets
        try {
          await assetCache.cleanExpiredAssets()
        } catch (error) {
          // Failed to clean expired assets, continue
        }
        
        // Register service worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/'
            })
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready
            
            // Pre-cache menu data for offline access
            await preCacheMenuData()
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Optionally notify user about update
                  }
                })
              }
            })
            
          } catch (error) {
            // Don't fail the entire initialization if SW registration fails
          }
        }
        
      } catch (error) {
        console.error('Failed to initialize offline functionality:', error)
        // Don't throw - let the app continue to work even if offline features fail
      }
    }

    // Pre-cache menu data for offline access
    const preCacheMenuData = async () => {
      try {
        // Check if we already have cached data
        const hasCached = await offlineUtils.hasCachedData()
        if (hasCached) {
          return
        }
        
        // Try to fetch and cache menu data
        if (navigator.onLine) {
          try {
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
              // Cache in IndexedDB
              await offlineUtils.cacheMenuData(
                categoriesResponse.data,
                menuItemsResponse.data.map(item => ({
                  ...item,
                  category_name: item.category?.name,
                  created_at: item.created_at || new Date().toISOString()
                }))
              )
              
              // Send to service worker for API caching
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
            // Failed to pre-cache menu data
          }
        }
      } catch (error) {
        // Pre-cache menu data failed
      }
    }

    initOffline()

    // Cleanup on unmount
    return () => {
      try {
        syncService.stopAutoSync()
      } catch (error) {
        // Failed to stop sync service
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}