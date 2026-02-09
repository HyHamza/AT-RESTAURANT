'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatPrice, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { offlineUtils, networkUtils } from '@/lib/offline-db'
import { useOffline } from '@/hooks/use-offline'
import { OrderStatusSkeleton } from '@/components/skeletons/order-status-skeleton'
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Utensils, 
  Search, 
  WifiOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import type { Order, OrderItem } from '@/types'
import type { OfflineOrder } from '@/lib/offline-db'
import Link from 'next/link'

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-pink-primary',
    bgColor: 'bg-pink-light',
    label: 'Order Received',
    description: 'Your order has been received and is being processed.'
  },
  preparing: {
    icon: Utensils,
    color: 'text-pink-primary',
    bgColor: 'bg-pink-light',
    label: 'Preparing',
    description: 'Our chefs are preparing your delicious meal.'
  },
  ready: {
    icon: Package,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Ready for Pickup',
    description: 'Your order is ready! Please come pick it up.'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Completed',
    description: 'Order completed. Thank you for dining with us!'
  },
  cancelled: {
    icon: Clock,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Cancelled',
    description: 'This order has been cancelled.'
  }
}

function OrderStatusContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id')
  const { isOnline, pendingOrders, forceSyncOrders } = useOffline()
  
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [offlineOrders, setOfflineOrders] = useState<OfflineOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [searchOrderId, setSearchOrderId] = useState(orderId || '')
  const [error, setError] = useState('')
  const [showOfflineOrders, setShowOfflineOrders] = useState(false)

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId)
    }
    loadOfflineOrders()
  }, [orderId])

  useEffect(() => {
    if (order && isOnline) {
      // Set up real-time subscription for order status updates
      const subscription = supabase
        .channel(`order-${order.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${order.id}`
          },
          (payload) => {
            setOrder(prev => prev ? { ...prev, ...payload.new } : null)
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [order, isOnline])

  const loadOfflineOrders = async () => {
    try {
      const orders = await offlineUtils.getUnsyncedOrders()
      setOfflineOrders(orders)
    } catch (error) {
      console.error('Failed to load offline orders:', error)
    }
  }

  const fetchOrder = async (orderIdToFetch: string) => {
    setLoading(true)
    setError('')

    try {
      // First check if it's an offline order
      const offlineOrder = offlineOrders.find(o => o.id === orderIdToFetch)
      if (offlineOrder) {
        setOrder({
          id: offlineOrder.id,
          user_id: offlineOrder.user_id || null,
          customer_name: offlineOrder.customer_name,
          customer_email: offlineOrder.customer_email,
          customer_phone: offlineOrder.customer_phone,
          total_amount: offlineOrder.total_amount,
          status: offlineOrder.status,
          notes: offlineOrder.notes || null,
          created_at: offlineOrder.created_at,
          updated_at: offlineOrder.created_at
        })
        
        // Convert offline items to order items format
        const items = offlineOrder.items.map((item, index) => ({
          id: `offline-${index}`,
          order_id: offlineOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          created_at: offlineOrder.created_at,
          menu_item: {
            id: item.menu_item_id,
            name: item.item_name,
            price: item.unit_price,
            category_id: '',
            description: null,
            image_url: null,
            is_available: true,
            sort_order: 0,
            created_at: offlineOrder.created_at
          }
        }))
        
        setOrderItems(items)
        return
      }

      // If online, try to fetch from database
      if (!isOnline) {
        setError('Cannot fetch online orders while offline. Check your pending orders below.')
        return
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderIdToFetch)
        .single()

      if (orderError) {
        if (orderError.code === 'PGRST116') {
          setError('Order not found. Please check your order ID or check pending orders below.')
        } else {
          throw orderError
        }
        return
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          menu_item:menu_items(*)
        `)
        .eq('order_id', orderIdToFetch)

      if (itemsError) throw itemsError

      setOrder(orderData)
      setOrderItems(itemsData || [])
    } catch (error) {
      console.error('Error fetching order:', error)
      setError('Failed to load order. Please try again or check pending orders below.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchOrderId.trim()) {
      fetchOrder(searchOrderId.trim())
    }
  }

  const handleSyncOrders = async () => {
    setSyncing(true)
    try {
      const result = await forceSyncOrders()
      await loadOfflineOrders() // Refresh offline orders list
      
      if (result.success > 0) {
        setError('')
        // If current order was synced, try to fetch it from server
        if (order && offlineOrders.find(o => o.id === order.id)) {
          setTimeout(() => fetchOrder(order.id), 1000)
        }
      }
    } catch (error) {
      console.error('Sync failed:', error)
      setError('Failed to sync orders. Please check your connection and try again.')
    } finally {
      setSyncing(false)
    }
  }

  const getStatusSteps = (currentStatus: string) => {
    const steps = ['pending', 'preparing', 'ready', 'completed']
    const currentIndex = steps.indexOf(currentStatus)
    
    if (currentStatus === 'cancelled') {
      return steps.map((step, index) => ({
        ...statusConfig[step as keyof typeof statusConfig],
        status: step,
        isActive: false,
        isCompleted: false,
        isCancelled: true
      }))
    }
    
    return steps.map((step, index) => ({
      ...statusConfig[step as keyof typeof statusConfig],
      status: step,
      isActive: index === currentIndex,
      isCompleted: index < currentIndex,
      isCancelled: false
    }))
  }

  const isOfflineOrder = order && offlineOrders.find(o => o.id === order.id)

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-dark heading-clean">Order Status</h1>
          
          {!isOnline && (
            <div className="flex items-center text-pink-primary">
              <WifiOff className="h-4 w-4 mr-2" />
              <span className="text-sm">Offline Mode</span>
            </div>
          )}
        </div>

        {/* Offline Orders Alert */}
        {pendingOrders > 0 && (
          <Card className="mb-6 card-pink-accent">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-pink-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-dark">
                      {pendingOrders} Order{pendingOrders > 1 ? 's' : ''} Pending Sync
                    </h3>
                    <p className="text-sm text-muted-text mt-1">
                      {isOnline 
                        ? 'Orders are being synced automatically. You can force sync if needed.'
                        : 'Orders will sync automatically when connection is restored.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowOfflineOrders(!showOfflineOrders)}
                  >
                    {showOfflineOrders ? 'Hide' : 'Show'} Pending Orders
                  </Button>
                  {isOnline && (
                    <Button
                      size="sm"
                      onClick={handleSyncOrders}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sync Now
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offline Orders List */}
        {showOfflineOrders && offlineOrders.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Pending Orders (Offline)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {offlineOrders.map((offlineOrder) => (
                  <div 
                    key={offlineOrder.id} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-light hover:shadow-clean transition-smooth"
                  >
                    <div>
                      <h3 className="font-semibold">{offlineOrder.id}</h3>
                      <p className="text-sm text-muted-text">
                        {offlineOrder.customer_name} • {formatPrice(offlineOrder.total_amount)}
                      </p>
                      <p className="text-xs text-muted-text">
                        Created: {formatDate(offlineOrder.created_at)}
                      </p>
                      {offlineOrder.sync_error && (
                        <p className="text-xs text-red-600 mt-1">
                          Sync Error: {offlineOrder.sync_error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-1 badge-pink">
                        Pending Sync
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchOrderId(offlineOrder.id)
                          fetchOrder(offlineOrder.id)
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Section */}
        <Card className="mb-8 card-white">
          <CardHeader>
            <CardTitle className="text-dark">Track Your Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter your order ID (e.g., ORD-ABC123)"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="input-clean"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} className="btn-pink-primary">
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Searching...' : 'Track Order'}
              </Button>
            </div>
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </CardContent>
        </Card>

        {order && (
          <>
            {/* Offline Order Warning */}
            {isOfflineOrder && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <WifiOff className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-800">Offline Order</h3>
                      <p className="text-sm text-blue-700">
                        This order is stored locally and will be sent to the restaurant when you're back online.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Information */}
            <Card className="mb-8 card-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-dark">
                  <span>Order #{order.id}</span>
                  {isOfflineOrder && (
                    <span className="text-sm badge-pink">
                      Pending Sync
                    </span>
                  )}
                </CardTitle>
                <p className="text-muted-text">
                  Placed on {formatDate(order.created_at)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2 text-dark">Customer Information</h3>
                    <p className="text-muted-text">{order.customer_name}</p>
                    <p className="text-muted-text">{order.customer_email}</p>
                    <p className="text-muted-text">{order.customer_phone}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-dark">Order Total</h3>
                    <p className="text-2xl font-bold text-pink-primary">
                      {formatPrice(order.total_amount)}
                    </p>
                    {order.notes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Special Instructions:</p>
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Order Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getStatusSteps(order.status).map((step, index) => {
                    const Icon = step.icon
                    return (
                      <div key={step.status} className="flex items-center space-x-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.isActive || step.isCompleted
                              ? step.bgColor
                              : step.isCancelled
                              ? 'bg-red-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              step.isActive || step.isCompleted
                                ? step.color
                                : step.isCancelled
                                ? 'text-red-600'
                                : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className={`font-semibold ${
                              step.isActive || step.isCompleted
                                ? 'text-gray-900'
                                : step.isCancelled
                                ? 'text-red-600'
                                : 'text-gray-400'
                            }`}
                          >
                            {step.label}
                          </h3>
                          <p
                            className={`text-sm ${
                              step.isActive || step.isCompleted
                                ? 'text-gray-600'
                                : step.isCancelled
                                ? 'text-red-500'
                                : 'text-gray-400'
                            }`}
                          >
                            {isOfflineOrder && step.status === 'pending' 
                              ? 'Order saved locally, will be sent when online'
                              : step.description
                            }
                          </p>
                        </div>
                        {step.isActive && !isOfflineOrder && (
                          <div className="animate-pulse">
                            <div className="w-2 h-2 bg-pink-primary rounded-full"></div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {order.status === 'ready' && !isOfflineOrder && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Ready for Pickup!</h4>
                    <p className="text-green-700 text-sm">
                      Your order is ready for pickup at AT RESTAURANT. Please bring this order ID: <strong>{order.id}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          {item.menu_item?.image_url ? (
                            <img
                              src={item.menu_item.image_url}
                              alt={item.menu_item.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-gray-500 text-xs">No Image</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{item.menu_item?.name}</h3>
                          <p className="text-gray-600 text-sm">
                            {formatPrice(item.unit_price)} × {item.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!order && !loading && !error && (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Track Your Order</h2>
            <p className="text-muted-text mb-6">
              Enter your order ID above to track the status of your order in real-time.
            </p>
            <Link href="/menu">
              <Button className="btn-pink-primary">
                Place New Order
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
export default function OrderStatusPage() {
  return (
    <Suspense fallback={<OrderStatusSkeleton />}>
      <OrderStatusContent />
    </Suspense>
  )
}