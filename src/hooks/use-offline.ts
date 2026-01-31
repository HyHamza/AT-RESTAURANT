'use client'

import { useState, useEffect, useCallback } from 'react'
import { syncService } from '@/lib/sync-service'
import { offlineUtils, networkUtils } from '@/lib/offline-db'

interface OfflineState {
  isOnline: boolean
  isServerReachable: boolean
  pendingOrders: number
  syncInProgress: boolean
  lastSyncAttempt: string | null
  cacheStats: {
    categories: number
    menuItems: number
    pendingOrders: number
    cachedAssets: number
    lastCacheUpdate: string | null
  } | null
}

interface OfflineActions {
  forceSyncOrders: () => Promise<{ success: number; failed: number }>
  clearOfflineData: () => Promise<void>
  refreshCacheStats: () => Promise<void>
  checkServerConnection: () => Promise<boolean>
}

export function useOffline(): OfflineState & OfflineActions {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isServerReachable: false,
    pendingOrders: 0,
    syncInProgress: false,
    lastSyncAttempt: null,
    cacheStats: null
  })

  // Update online status
  const updateOnlineStatus = useCallback((isOnline: boolean) => {
    setState(prev => ({ ...prev, isOnline }))
  }, [])

  // Check server connection
  const checkServerConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isReachable = await networkUtils.checkServerConnection()
      setState(prev => ({ ...prev, isServerReachable: isReachable }))
      return isReachable
    } catch (error) {
      setState(prev => ({ ...prev, isServerReachable: false }))
      return false
    }
  }, [])

  // Refresh sync status
  const refreshSyncStatus = useCallback(async () => {
    try {
      const syncStatus = await syncService.getSyncStatus()
      setState(prev => ({
        ...prev,
        pendingOrders: syncStatus.pendingOrders,
        syncInProgress: syncStatus.syncInProgress,
        lastSyncAttempt: syncStatus.lastSyncAttempt
      }))
    } catch (error) {
      console.error('Failed to refresh sync status:', error)
    }
  }, [])

  // Refresh cache statistics
  const refreshCacheStats = useCallback(async () => {
    try {
      const stats = await offlineUtils.getCacheStats()
      setState(prev => ({ ...prev, cacheStats: stats }))
    } catch (error) {
      console.error('Failed to refresh cache stats:', error)
    }
  }, [])

  // Force sync orders
  const forceSyncOrders = useCallback(async (): Promise<{ success: number; failed: number }> => {
    try {
      setState(prev => ({ ...prev, syncInProgress: true }))
      const result = await syncService.forceSyncAll()
      await refreshSyncStatus()
      return result
    } catch (error) {
      console.error('Failed to force sync orders:', error)
      throw error
    } finally {
      setState(prev => ({ ...prev, syncInProgress: false }))
    }
  }, [refreshSyncStatus])

  // Clear offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineUtils.clearAllData()
      await refreshSyncStatus()
      await refreshCacheStats()
    } catch (error) {
      console.error('Failed to clear offline data:', error)
      throw error
    }
  }, [refreshSyncStatus, refreshCacheStats])

  // Initialize and set up listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initial checks
    checkServerConnection()
    refreshSyncStatus()
    refreshCacheStats()

    // Start sync service
    syncService.startAutoSync()

    // Listen for network changes
    const cleanup = networkUtils.onNetworkChange((isOnline) => {
      updateOnlineStatus(isOnline)
      if (isOnline) {
        checkServerConnection()
      }
    })

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        refreshSyncStatus()
      } else if (event.data?.type === 'SYNC_FAILED') {
        refreshSyncStatus()
      } else if (event.data?.type === 'SYNC_REQUEST') {
        // Service worker is requesting a sync, trigger it
        syncService.syncPendingOrders().then(result => {
          // Send result back to service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SYNC_COMPLETE',
              data: result
            })
          }
        }).catch(error => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SYNC_FAILED',
              error: error.message
            })
          }
        })
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage)

    // Periodic status refresh
    const statusInterval = setInterval(() => {
      refreshSyncStatus()
      if (state.isOnline) {
        checkServerConnection()
      }
    }, 60000) // Every minute

    // Cache stats refresh (less frequent)
    const cacheInterval = setInterval(() => {
      refreshCacheStats()
    }, 300000) // Every 5 minutes

    return () => {
      cleanup()
      syncService.stopAutoSync()
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)
      clearInterval(statusInterval)
      clearInterval(cacheInterval)
    }
  }, [updateOnlineStatus, checkServerConnection, refreshSyncStatus, refreshCacheStats, state.isOnline])

  return {
    ...state,
    forceSyncOrders,
    clearOfflineData,
    refreshCacheStats,
    checkServerConnection
  }
}

// Hook for service worker registration and management
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        setRegistration(reg)

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          
          if (newWorker) {
            setInstalling(true)
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
                setInstalling(false)
              }
            })
          }
        })

        // Listen for controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })

      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }

    registerSW()
  }, [])

  const updateServiceWorker = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [registration])

  const triggerSync = useCallback(() => {
    if (registration && 'sync' in registration) {
      ;(registration as any).sync?.register('order-sync').catch((error: any) => {
        console.error('Failed to register background sync:', error)
      })
    }
  }, [registration])

  return {
    registration,
    updateAvailable,
    installing,
    updateServiceWorker,
    triggerSync
  }
}