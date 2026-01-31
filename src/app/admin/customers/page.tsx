'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'
import { 
  Search, 
  Eye, 
  Mail, 
  Phone, 
  Calendar, 
  ShoppingBag,
  DollarSign,
  TrendingUp,
  User,
  MapPin,
  Clock,
  Package
} from 'lucide-react'

interface Customer {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  is_admin: boolean
  created_at: string
  order_count?: number
  total_spent?: number
  last_order_date?: string
  avg_order_value?: number
}

interface CustomerOrder {
  id: string
  total_amount: number
  status: string
  created_at: string
  customer_name: string
  customer_phone: string
  notes: string | null
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'spent' | 'recent'>('recent')
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      // Get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('[AT RESTAURANT - Admin Customers] Users fetch error:', usersError)
        return
      }

      // Get order statistics for each user
      const { data: orderStats, error: orderStatsError } = await supabase
        .from('orders')
        .select('user_id, customer_email, total_amount, status, created_at')

      if (orderStatsError) {
        console.error('[AT RESTAURANT - Admin Customers] Order stats error:', orderStatsError)
      }

      // Calculate customer statistics
      const customerStats = new Map()
      orderStats?.forEach(order => {
        const customerId = order.user_id || order.customer_email
        if (customerId) {
          const current = customerStats.get(customerId) || { 
            count: 0, 
            total: 0, 
            lastOrder: null 
          }
          current.count += 1
          current.total += order.total_amount
          if (!current.lastOrder || new Date(order.created_at) > new Date(current.lastOrder)) {
            current.lastOrder = order.created_at
          }
          customerStats.set(customerId, current)
        }
      })

      // Combine user data with statistics
      const enrichedCustomers = usersData?.map(user => {
        const stats = customerStats.get(user.id) || customerStats.get(user.email) || { count: 0, total: 0, lastOrder: null }
        return {
          ...user,
          order_count: stats.count,
          total_spent: stats.total,
          last_order_date: stats.lastOrder,
          avg_order_value: stats.count > 0 ? stats.total / stats.count : 0
        }
      }) || []

      setCustomers(enrichedCustomers)
    } catch (error) {
      console.error('[AT RESTAURANT - Admin Customers] Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerOrders = async (customer: Customer) => {
    setOrdersLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`user_id.eq.${customer.id},customer_email.eq.${customer.email}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[AT RESTAURANT - Admin Customers] Customer orders error:', error)
        return
      }

      setCustomerOrders(data || [])
    } catch (error) {
      console.error('[AT RESTAURANT - Admin Customers] Error loading customer orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCustomerDetails(true)
    await loadCustomerOrders(customer)
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

  const sortCustomers = (customers: Customer[]) => {
    switch (sortBy) {
      case 'name':
        return [...customers].sort((a, b) => 
          (a.full_name || a.email).localeCompare(b.full_name || b.email)
        )
      case 'orders':
        return [...customers].sort((a, b) => (b.order_count || 0) - (a.order_count || 0))
      case 'spent':
        return [...customers].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
      case 'recent':
      default:
        return [...customers].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }
  }

  const filteredCustomers = sortCustomers(
    customers.filter(customer => {
      const searchLower = searchQuery.toLowerCase()
      return (
        customer.email.toLowerCase().includes(searchLower) ||
        customer.full_name?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(searchQuery)
      )
    })
  )

  // Calculate summary statistics
  const totalCustomers = customers.length
  const totalOrders = customers.reduce((sum, customer) => sum + (customer.order_count || 0), 0)
  const totalRevenue = customers.reduce((sum, customer) => sum + (customer.total_spent || 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

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
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">View and manage customer information and order history</p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(avgOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search customers by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name A-Z</option>
              <option value="orders">Most Orders</option>
              <option value="spent">Highest Spending</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No customers found</p>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-lg">
                          {customer.full_name?.charAt(0) || customer.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">
                            {customer.full_name || 'No name provided'}
                          </h3>
                          {customer.is_admin && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </span>
                          {customer.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {customer.phone}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Joined {formatDate(customer.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="font-semibold text-lg">{customer.order_count || 0}</p>
                            <p className="text-gray-600 text-xs">Orders</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-lg text-orange-500">
                              {formatPrice(customer.total_spent || 0)}
                            </p>
                            <p className="text-gray-600 text-xs">Total Spent</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-lg">
                              {formatPrice(customer.avg_order_value || 0)}
                            </p>
                            <p className="text-gray-600 text-xs">Avg Order</p>
                          </div>
                        </div>
                        {customer.last_order_date && (
                          <p className="text-gray-500 text-xs mt-1">
                            Last order: {formatDate(customer.last_order_date)}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleViewCustomer(customer)}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Modal */}
      {showCustomerDetails && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Customer Details</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowCustomerDetails(false)}
                >
                  ×
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Information */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-gray-600 font-medium text-2xl">
                              {selectedCustomer.full_name?.charAt(0) || selectedCustomer.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg">
                            {selectedCustomer.full_name || 'No name provided'}
                          </h3>
                          {selectedCustomer.is_admin && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded-full font-medium">
                              Administrator
                            </span>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <p className="text-gray-900 flex items-center">
                              <Mail className="h-4 w-4 mr-2" />
                              {selectedCustomer.email}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Phone</label>
                            <p className="text-gray-900 flex items-center">
                              <Phone className="h-4 w-4 mr-2" />
                              {selectedCustomer.phone || 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Member Since</label>
                            <p className="text-gray-900 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {formatDate(selectedCustomer.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Customer Statistics */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Order Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Orders</span>
                          <span className="font-semibold">{selectedCustomer.order_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Spent</span>
                          <span className="font-semibold text-orange-500">
                            {formatPrice(selectedCustomer.total_spent || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Average Order Value</span>
                          <span className="font-semibold">
                            {formatPrice(selectedCustomer.avg_order_value || 0)}
                          </span>
                        </div>
                        {selectedCustomer.last_order_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Order</span>
                            <span className="font-semibold">
                              {formatDate(selectedCustomer.last_order_date)}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order History */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        Order History ({customerOrders.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {ordersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                      ) : customerOrders.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                          <p className="text-gray-600">This customer hasn't placed any orders.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {customerOrders.map((order) => (
                            <div key={order.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold">Order #{order.id}</h4>
                                  <p className="text-sm text-gray-600 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDate(order.created_at)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-lg">{formatPrice(order.total_amount)}</p>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-sm text-gray-600">
                                <p><strong>Customer Name:</strong> {order.customer_name}</p>
                                <p><strong>Phone:</strong> {order.customer_phone}</p>
                                {order.notes && (
                                  <p><strong>Notes:</strong> {order.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomerDetails(false)}
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