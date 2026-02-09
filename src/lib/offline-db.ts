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

// Check if IndexedDB is available
let indexedDBAvailable = true
try {
  if (typeof window !== 'undefined' && !window.indexedDB) {
    indexedDBAvailable = false
  }
} catch {
  indexedDBAvailable = false
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

// Safe database wrapper that handles private mode
let offlineDb: OfflineDatabase | null = null

try {
  if (indexedDBAvailable) {
    offlineDb = new OfflineDatabase()
  }
} catch (error) {
  console.warn('[OfflineDB] Failed to initialize database (likely private mode):', error)
  indexedDBAvailable = false
}

// Safe database operation wrapper
async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!indexedDBAvailable || !offlineDb) {
    console.warn('[OfflineDB] Database not available')
    return fallback
  }

  try {
    return await operation()
  } catch (error) {
    console.warn('[OfflineDB] Database operation failed:', error)
    return fallback
  }
}

export { offlineDb }

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
    return safeDbOperation(async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}`)
      
      const blob = await response.blob()
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
      
      await offlineDb!.cachedAssets.put({
        url,
        blob,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt
      })
    }, undefined)
  },

  async getCachedAsset(url: string): Promise<string | null> {
    return safeDbOperation(async () => {
      const cached = await offlineDb!.cachedAssets.get(url)
      if (!cached) return null
      
      // Check if expired
      if (new Date(cached.expires_at) < new Date()) {
        await offlineDb!.cachedAssets.delete(url)
        return null
      }
      
      return URL.createObjectURL(cached.blob)
    }, null)
  },

  async cleanExpiredAssets(): Promise<void> {
    return safeDbOperation(async () => {
      const now = new Date().toISOString()
      await offlineDb!.cachedAssets.where('expires_at').below(now).delete()
    }, undefined)
  }
}

// Enhanced offline utilities
export const offlineUtils = {
  // Cache menu data with better error handling
  async cacheMenuData(categories: OfflineCategory[], menuItems: OfflineMenuItem[]): Promise<void> {
    return safeDbOperation(async () => {
      await offlineDb!.transaction('rw', [offlineDb!.categories, offlineDb!.menuItems, offlineDb!.syncLogs], async () => {
        await offlineDb!.categories.clear()
        await offlineDb!.menuItems.clear()
        await offlineDb!.categories.bulkAdd(categories)
        await offlineDb!.menuItems.bulkAdd(menuItems)
        
        // Log successful cache
        await offlineDb!.syncLogs.add({
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
    }, undefined)
  },

  // Get cached menu data
  async getCachedMenuData(): Promise<{ categories: OfflineCategory[], menuItems: OfflineMenuItem[] }> {
    return safeDbOperation(async () => {
      const categories = await offlineDb!.categories.orderBy('sort_order').toArray()
      const menuItems = await offlineDb!.menuItems.orderBy('sort_order').toArray()
      return { categories, menuItems }
    }, { categories: [], menuItems: [] })
  },

  // Store order offline with retry logic
  async storeOfflineOrder(order: OfflineOrder): Promise<void> {
    return safeDbOperation(async () => {
      await offlineDb!.orders.add({
        ...order,
        sync_attempts: 0,
        synced: 0
      })
      
      await offlineDb!.syncLogs.add({
        action: 'order_sync',
        status: 'pending',
        details: `Order ${order.id} stored offline`,
        created_at: new Date().toISOString()
      })
    }, undefined)
  },

  // Get unsynced orders
  async getUnsyncedOrders(): Promise<OfflineOrder[]> {
    return safeDbOperation(async () => {
      return await offlineDb!.orders.where('synced').equals(0).toArray()
    }, [])
  },

  // Mark order as synced
  async markOrderSynced(orderId: string): Promise<void> {
    return safeDbOperation(async () => {
      await offlineDb!.orders.update(orderId, { 
        synced: 1,
        last_sync_attempt: new Date().toISOString()
      })
    }, undefined)
  },

  // Mark order sync failed
  async markOrderSyncFailed(orderId: string, error: string): Promise<void> {
    return safeDbOperation(async () => {
      const order = await offlineDb!.orders.get(orderId)
      if (order) {
        await offlineDb!.orders.update(orderId, {
          sync_attempts: (order.sync_attempts || 0) + 1,
          last_sync_attempt: new Date().toISOString(),
          sync_error: error
        })
      }
    }, undefined)
  },

  // Check if we have cached data
  async hasCachedData(): Promise<boolean> {
    return safeDbOperation(async () => {
      const categoryCount = await offlineDb!.categories.count()
      const menuItemCount = await offlineDb!.menuItems.count()
      return categoryCount > 0 && menuItemCount > 0
    }, false)
  },

  // Get cache statistics
  async getCacheStats(): Promise<{
    categories: number
    menuItems: number
    pendingOrders: number
    cachedAssets: number
    lastCacheUpdate: string | null
  }> {
    return safeDbOperation(async () => {
      const [categories, menuItems, pendingOrders, cachedAssets] = await Promise.all([
        offlineDb!.categories.count(),
        offlineDb!.menuItems.count(),
        offlineDb!.orders.where('synced').equals(0).count(),
        offlineDb!.cachedAssets.count()
      ])

      const lastCacheLog = await offlineDb!.syncLogs
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
    }, {
      categories: 0,
      menuItems: 0,
      pendingOrders: 0,
      cachedAssets: 0,
      lastCacheUpdate: null
    })
  },

  // Clear all offline data
  async clearAllData(): Promise<void> {
    return safeDbOperation(async () => {
      await offlineDb!.transaction('rw', [
        offlineDb!.orders,
        offlineDb!.categories,
        offlineDb!.menuItems,
        offlineDb!.cachedAssets,
        offlineDb!.syncLogs
      ], async () => {
        await offlineDb!.orders.clear()
        await offlineDb!.categories.clear()
        await offlineDb!.menuItems.clear()
        await offlineDb!.cachedAssets.clear()
        await offlineDb!.syncLogs.clear()
      })
    }, undefined)
  },

  // Settings management
  async getSetting(key: string, defaultValue: any = null): Promise<any> {
    return safeDbOperation(async () => {
      const setting = await offlineDb!.settings.get(key)
      return setting ? setting.value : defaultValue
    }, defaultValue)
  },

  async setSetting(key: string, value: any): Promise<void> {
    return safeDbOperation(async () => {
      await offlineDb!.settings.put({
        key,
        value,
        updated_at: new Date().toISOString()
      })
    }, undefined)
  }
}