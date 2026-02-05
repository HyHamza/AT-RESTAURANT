import Dexie, { Table } from 'dexie'

// Database interfaces
export interface OfflineOrder {
  id: string
  user_id?: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  total_amount: number
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  notes?: string | null
  items: Array<{
    menu_item_id: string
    quantity: number
    unit_price: number
    total_price: number
    item_name: string
  }>
  created_at: string
  synced: 0 | 1 // 0 = not synced, 1 = synced
  sync_attempts?: number
  last_sync_attempt?: string
  sync_error?: string
}

export interface OfflineCategory {
  id: string
  name: string
  description: string | null
  emoji: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface OfflineMenuItem {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  sort_order: number
  created_at: string
  updated_at?: string
  category_name?: string
}

export interface CachedAsset {
  url: string
  blob: Blob
  cached_at: string
  expires_at: string
}

export interface SyncLog {
  id?: number
  action: 'order_sync' | 'data_cache' | 'asset_cache'
  status: 'success' | 'error' | 'pending'
  details: string
  created_at: string
  error_message?: string
}

export interface AppSettings {
  key: string
  value: any
  updated_at: string
}
// Database class
class OfflineDatabase extends Dexie {
  orders!: Table<OfflineOrder>
  categories!: Table<OfflineCategory>
  menuItems!: Table<OfflineMenuItem>
  cachedAssets!: Table<CachedAsset>
  syncLogs!: Table<SyncLog>
  settings!: Table<AppSettings>

  constructor() {
    super('AtRestaurantDB')
    
    this.version(1).stores({
      orders: 'id, user_id, synced, created_at, status',
      categories: 'id, sort_order, is_active',
      menuItems: 'id, category_id, sort_order, is_available',
      cachedAssets: 'url, expires_at',
      syncLogs: '++id, action, status, created_at',
      settings: 'key'
    })
  }
}

export const offlineDb = new OfflineDatabase()

// Network status utilities
export const networkUtils = {
  isOnline: () => navigator.onLine,
  
  // Enhanced connection check with actual server ping
  async checkServerConnection(): Promise<boolean> {
    if (!navigator.onLine) return false
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      })
      
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  },

  // Listen for network changes
  onNetworkChange(callback: (isOnline: boolean) => void) {
    const handleOnline = () => callback(true)
    const handleOffline = () => callback(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }
}

// Asset caching utilities
export const assetCache = {
  async cacheAsset(url: string, expiryHours: number = 24): Promise<void> {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}`)
      
      const blob = await response.blob()
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
      
      await offlineDb.cachedAssets.put({
        url,
        blob,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt
      })
    } catch (error) {
      // Asset caching failed, continue without caching
    }
  },

  async getCachedAsset(url: string): Promise<string | null> {
    try {
      const cached = await offlineDb.cachedAssets.get(url)
      if (!cached) return null
      
      // Check if expired
      if (new Date(cached.expires_at) < new Date()) {
        await offlineDb.cachedAssets.delete(url)
        return null
      }
      
      return URL.createObjectURL(cached.blob)
    } catch (error) {
      return null
    }
  },

  async cleanExpiredAssets(): Promise<void> {
    try {
      const now = new Date().toISOString()
      await offlineDb.cachedAssets.where('expires_at').below(now).delete()
    } catch (error) {
      // Failed to clean expired assets, continue
    }
  }
}

// Enhanced offline utilities
export const offlineUtils = {
  // Cache menu data with better error handling
  async cacheMenuData(categories: OfflineCategory[], menuItems: OfflineMenuItem[]): Promise<void> {
    try {
      await offlineDb.transaction('rw', [offlineDb.categories, offlineDb.menuItems, offlineDb.syncLogs], async () => {
        await offlineDb.categories.clear()
        await offlineDb.menuItems.clear()
        await offlineDb.categories.bulkAdd(categories)
        await offlineDb.menuItems.bulkAdd(menuItems)
        
        // Log successful cache
        await offlineDb.syncLogs.add({
          action: 'data_cache',
          status: 'success',
          details: `Cached ${categories.length} categories and ${menuItems.length} menu items`,
          created_at: new Date().toISOString()
        })
      })

      // Cache associated images
      const imageUrls = [
        ...categories.filter(c => c.image_url).map(c => c.image_url!),
        ...menuItems.filter(m => m.image_url).map(m => m.image_url!)
      ]

      for (const url of imageUrls) {
        await assetCache.cacheAsset(url)
      }

    } catch (error) {
      await offlineDb.syncLogs.add({
        action: 'data_cache',
        status: 'error',
        details: 'Failed to cache menu data',
        created_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  },

  // Get cached menu data
  async getCachedMenuData(): Promise<{ categories: OfflineCategory[], menuItems: OfflineMenuItem[] }> {
    const categories = await offlineDb.categories.orderBy('sort_order').toArray()
    const menuItems = await offlineDb.menuItems.orderBy('sort_order').toArray()
    return { categories, menuItems }
  },

  // Store order offline with retry logic
  async storeOfflineOrder(order: OfflineOrder): Promise<void> {
    try {
      await offlineDb.orders.add({
        ...order,
        sync_attempts: 0,
        synced: 0
      })
      
      await offlineDb.syncLogs.add({
        action: 'order_sync',
        status: 'pending',
        details: `Order ${order.id} stored offline`,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to store offline order:', error)
      throw error
    }
  },

  // Get unsynced orders
  async getUnsyncedOrders(): Promise<OfflineOrder[]> {
    return await offlineDb.orders.where('synced').equals(0).toArray()
  },

  // Mark order as synced
  async markOrderSynced(orderId: string): Promise<void> {
    await offlineDb.orders.update(orderId, { 
      synced: 1,
      last_sync_attempt: new Date().toISOString()
    })
  },

  // Mark order sync failed
  async markOrderSyncFailed(orderId: string, error: string): Promise<void> {
    const order = await offlineDb.orders.get(orderId)
    if (order) {
      await offlineDb.orders.update(orderId, {
        sync_attempts: (order.sync_attempts || 0) + 1,
        last_sync_attempt: new Date().toISOString(),
        sync_error: error
      })
    }
  },

  // Check if we have cached data
  async hasCachedData(): Promise<boolean> {
    const categoryCount = await offlineDb.categories.count()
    const menuItemCount = await offlineDb.menuItems.count()
    return categoryCount > 0 && menuItemCount > 0
  },

  // Get cache statistics
  async getCacheStats(): Promise<{
    categories: number
    menuItems: number
    pendingOrders: number
    cachedAssets: number
    lastCacheUpdate: string | null
  }> {
    const [categories, menuItems, pendingOrders, cachedAssets] = await Promise.all([
      offlineDb.categories.count(),
      offlineDb.menuItems.count(),
      offlineDb.orders.where('synced').equals(0).count(),
      offlineDb.cachedAssets.count()
    ])

    const lastCacheLog = await offlineDb.syncLogs
      .where('action').equals('data_cache')
      .filter(log => log.status === 'success')
      .reverse()
      .first()

    return {
      categories,
      menuItems,
      pendingOrders,
      cachedAssets,
      lastCacheUpdate: lastCacheLog?.created_at || null
    }
  },

  // Clear all offline data
  async clearAllData(): Promise<void> {
    await offlineDb.transaction('rw', [
      offlineDb.orders,
      offlineDb.categories,
      offlineDb.menuItems,
      offlineDb.cachedAssets,
      offlineDb.syncLogs
    ], async () => {
      await offlineDb.orders.clear()
      await offlineDb.categories.clear()
      await offlineDb.menuItems.clear()
      await offlineDb.cachedAssets.clear()
      await offlineDb.syncLogs.clear()
    })
  },

  // Settings management
  async getSetting(key: string, defaultValue: any = null): Promise<any> {
    const setting = await offlineDb.settings.get(key)
    return setting ? setting.value : defaultValue
  },

  async setSetting(key: string, value: any): Promise<void> {
    await offlineDb.settings.put({
      key,
      value,
      updated_at: new Date().toISOString()
    })
  }
}