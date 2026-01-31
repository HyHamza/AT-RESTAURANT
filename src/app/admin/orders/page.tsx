'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'
import { Search, Eye, Clock, Utensils, Package, CheckCircle, X, Bell, MapPin, ExternalLink } from 'lucide-react'
import type { Order, OrderItem } from '@/types'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  useEffect(() => {
    loadOrders()
    
    // Set up real-time subscription for order updates
    const subscription = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Show notification for new orders
            showNewOrderNotification(payload.new as Order)
          }
          loadOrders()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          menu_item:menu_items(*)
        `)
        .eq('order_id', orderId)

      if (error) throw error
      setOrderItems(data || [])
    } catch (error) {
      console.error('Error loading order items:', error)
    }
  }

  const showNewOrderNotification = (order: Order) => {
    // Create a simple notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Order Received!', {
        body: `Order #${order.id} from ${order.customer_name} - ${formatPrice(order.total_amount)}`,
        icon: '/favicon.ico'
      })
    }
    
    // You could also show a toast notification here
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // Add status log
      await supabase
        .from('order_status_logs')
        .insert({
          order_id: orderId,
          status: newStatus,
          notes: `Status updated to ${newStatus} by admin`
        })

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus as any, updated_at: new Date().toISOString() }
          : order
      ))

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null)
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Failed to update order status')
    }
  }

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order)
    await loadOrderItems(order.id)
    setShowOrderDetails(true)
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'preparing':
        return <Utensils className="h-4 w-4" />
      case 'ready':
        return <Package className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <X className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'preparing':
        return 'text-blue-600 bg-blue-100'
      case 'ready':
        return 'text-green-600 bg-green-100'
      case 'completed':
        return 'text-green-700 bg-green-200'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing'
      case 'preparing':
        return 'ready'
      case 'ready':
        return 'completed'
      default:
        return null
    }
  }

  const getNextStatusLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'Start Preparing'
      case 'preparing':
        return 'Mark Ready'
      case 'ready':
        return 'Mark Completed'
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600">Manage and track all customer orders</p>
        </div>
        <Button
          onClick={() => {
            if ('Notification' in window && Notification.permission === 'default') {
              Notification.requestPermission()
            }
          }}
          variant="outline"
        >
          <Bell className="h-4 w-4 mr-2" />
          Enable Notifications
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search orders by ID, customer name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders found</p>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <p className="font-semibold">#{order.id}</p>
                      <p className="text-sm text-gray-600">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(order.total_amount)}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      {getNextStatus(order.status) && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {getNextStatusLabel(order.status)}
                        </Button>
                      )}
                      
                      {order.status !== 'cancelled' && order.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Order #{selectedOrder.id}</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowOrderDetails(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <p>{selectedOrder.customer_name}</p>
                  <p className="text-gray-600">{selectedOrder.customer_email}</p>
                  <p className="text-gray-600">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Order Details</h3>
                  <p>Status: <span className={`px-2 py-1 rounded text-sm ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </span></p>
                  <p className="text-gray-600">Placed: {formatDate(selectedOrder.created_at)}</p>
                  <p className="text-gray-600">Total: <span className="font-semibold">{formatPrice(selectedOrder.total_amount)}</span></p>
                </div>
              </div>

              {/* Delivery Location Section */}
              {(selectedOrder.delivery_latitude && selectedOrder.delivery_longitude) || selectedOrder.delivery_address ? (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-orange-500" />
                    Delivery Location
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedOrder.delivery_address && (
                      <p className="text-gray-800 mb-2">{selectedOrder.delivery_address}</p>
                    )}
                    
                    {selectedOrder.delivery_latitude && selectedOrder.delivery_longitude ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          Coordinates: {selectedOrder.delivery_latitude.toFixed(6)}, {selectedOrder.delivery_longitude.toFixed(6)}
                        </p>
                        
                        {selectedOrder.location_method && (
                          <p className="text-sm text-gray-600">
                            Location method: 
                            <span className={`ml-1 px-2 py-1 rounded text-xs ${
                              selectedOrder.location_method === 'gps' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {selectedOrder.location_method === 'gps' ? 'GPS' : 'Manual'}
                            </span>
                          </p>
                        )}
                        
                        {selectedOrder.location_accuracy && selectedOrder.location_method === 'gps' && (
                          <p className="text-sm text-gray-600">
                            GPS accuracy: ±{Math.round(selectedOrder.location_accuracy)}m
                          </p>
                        )}
                        
                        <div className="flex space-x-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const url = `https://www.google.com/maps?q=${selectedOrder.delivery_latitude},${selectedOrder.delivery_longitude}`
                              window.open(url, '_blank')
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View on Maps
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Restaurant location (Faisalabad, Pakistan)
                              const restaurantLat = 31.4504
                              const restaurantLon = 73.1350
                              const url = `https://www.google.com/maps/dir/${restaurantLat},${restaurantLon}/${selectedOrder.delivery_latitude},${selectedOrder.delivery_longitude}`
                              window.open(url, '_blank')
                            }}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Get Directions
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Address only (no GPS coordinates)</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    Delivery Location
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-yellow-800 text-sm">No delivery location provided</p>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold mb-4">Order Items</h3>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">{item.menu_item?.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatPrice(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">{formatPrice(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                {getNextStatus(selectedOrder.status) && (
                  <Button
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, getNextStatus(selectedOrder.status)!)
                      setShowOrderDetails(false)
                    }}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {getNextStatusLabel(selectedOrder.status)}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}