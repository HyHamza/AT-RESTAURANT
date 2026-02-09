import { supabase } from './supabase'
import { offlineUtils, offlineDb, networkUtils } from './offline-db'
import type { OfflineOrder } from './offline-db'

export class SyncService {
  private static instance: SyncService
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  // Start automatic sync when online
  startAutoSync(): void {
    // Initial sync attempt
    this.syncPendingOrders()

    // Set up periodic sync every 30 seconds
    this.syncInterval = setInterval(() => {
      if (networkUtils.isOnline() && !this.syncInProgress) {
        this.syncPendingOrders()
      }
    }, 30000)

    // Listen for network changes
    networkUtils.onNetworkChange((isOnline) => {
      if (isOnline && !this.syncInProgress) {
        setTimeout(() => this.syncPendingOrders(), 1000) // Small delay to ensure connection is stable
      }
    })
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()
  }

  // Sync all pending orders
  async syncPendingOrders(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      return { success: 0, failed: 0 }
    }

    if (!networkUtils.isOnline()) {
      return { success: 0, failed: 0 }
    }

    this.syncInProgress = true
    let successCount = 0
    let failedCount = 0

    try {
      // Check server connection first
      const serverReachable = await networkUtils.checkServerConnection()
      if (!serverReachable) {
        return { success: 0, failed: 0 }
      }

      const pendingOrders = await offlineUtils.getUnsyncedOrders()

      if (pendingOrders.length === 0) {
        return { success: 0, failed: 0 }
      }

      // Sort by creation date (oldest first)
      pendingOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      for (const order of pendingOrders) {
        try {
          // Skip if too many failed attempts
          if ((order.sync_attempts || 0) >= 5) {
            continue
          }

          await this.syncSingleOrder(order)
          successCount++

        } catch (error) {
          failedCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Failed to sync order ${order.id}:`, errorMessage)
          
          await offlineUtils.markOrderSyncFailed(order.id, errorMessage)
          
          // Schedule retry with exponential backoff
          this.scheduleRetry(order.id, (order.sync_attempts || 0) + 1)
        }
      }

    } catch (error) {
      console.error('Sync process failed:', error)
    } finally {
      this.syncInProgress = false
    }

    return { success: successCount, failed: failedCount }
  }

  // Sync a single order to Supabase
  private async syncSingleOrder(order: OfflineOrder): Promise<void> {
    // Insert order
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: order.id,
        user_id: order.user_id || null,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        total_amount: order.total_amount,
        status: order.status,
        notes: order.notes || null,
        created_at: order.created_at
      })
      .select()
      .single()

    if (orderError) {
      // Check if it's a duplicate key error (order already exists)
      if (orderError.code === '23505') {
        await offlineUtils.markOrderSynced(order.id)
        return
      }
      throw new Error(`Failed to insert order: ${orderError.message}`)
    }

    // Insert order items
    const orderItems = order.items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      throw new Error(`Failed to insert order items: ${itemsError.message}`)
    }

    // Create status log
    const { error: statusError } = await supabase
      .from('order_status_logs')
      .insert({
        order_id: order.id,
        status: order.status,
        notes: 'Order synced from offline storage',
        created_at: order.created_at
      })

    if (statusError) {
      // Don't throw here as the order sync was successful
    }

    // Mark as synced
    await offlineUtils.markOrderSynced(order.id)

    // Log successful sync
    if (offlineDb) {
      await offlineDb.syncLogs.add({
        action: 'order_sync',
        status: 'success',
        details: `Order ${order.id} synced successfully`,
        created_at: new Date().toISOString()
      })
    }
  }

  // Schedule retry with exponential backoff
  private scheduleRetry(orderId: string, attemptNumber: number): void {
    // Clear existing timeout for this order
    const existingTimeout = this.retryTimeouts.get(orderId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Calculate delay: 2^attempt * 1000ms (1s, 2s, 4s, 8s, 16s)
    const delay = Math.min(Math.pow(2, attemptNumber) * 1000, 60000) // Max 1 minute

    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(orderId)
      
      if (networkUtils.isOnline() && !this.syncInProgress && offlineDb) {
        try {
          const order = await offlineDb.orders.get(orderId)
          if (order && order.synced === 0) {
            await this.syncSingleOrder(order)
          }
        } catch (error) {
          console.error(`Retry failed for order ${orderId}:`, error)
          
          // Schedule another retry if not too many attempts
          if (attemptNumber < 5) {
            this.scheduleRetry(orderId, attemptNumber + 1)
          }
        }
      }
    }, delay)

    this.retryTimeouts.set(orderId, timeout)
  }

  // Force sync all orders (manual trigger)
  async forceSyncAll(): Promise<{ success: number; failed: number }> {
    if (!networkUtils.isOnline()) {
      throw new Error('Cannot sync while offline')
    }

    // Reset sync attempts for all orders to give them another chance
    if (offlineDb) {
      const pendingOrders = await offlineUtils.getUnsyncedOrders()
      for (const order of pendingOrders) {
        await offlineDb.orders.update(order.id, {
          sync_attempts: 0,
          sync_error: undefined
        })
      }
    }

    return await this.syncPendingOrders()
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    pendingOrders: number
    lastSyncAttempt: string | null
    isOnline: boolean
    syncInProgress: boolean
  }> {
    const pendingOrders = await offlineUtils.getUnsyncedOrders()
    
    const lastSyncLog = offlineDb 
      ? await offlineDb.syncLogs
          .where('action').equals('order_sync')
          .reverse()
          .first()
      : null

    return {
      pendingOrders: pendingOrders.length,
      lastSyncAttempt: lastSyncLog?.created_at || null,
      isOnline: networkUtils.isOnline(),
      syncInProgress: this.syncInProgress
    }
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance()