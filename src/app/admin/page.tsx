'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { Package, DollarSign, Clock, CheckCircle, TrendingUp, Users, ShoppingBag, Eye } from 'lucide-react'
import { StatCard } from '@/components/admin/stat-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useIsMobile } from '@/hooks/use-media-query'

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  todayRevenue: number
  totalRevenue: number
  totalCustomers: number
  averageOrderValue: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageOrderValue: 0
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    loadDashboardData()
    
    // Set up real-time subscription for new orders
    const subscription = supabase
      .channel('admin-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        () => {
          loadDashboardData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      // Get all orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (orders) {
        const today = new Date().toISOString().split('T')[0]
        const todayOrders = orders.filter(order => 
          order.created_at.startsWith(today)
        )

        const pendingOrders = orders.filter(order => 
          order.status === 'pending' || order.status === 'preparing'
        )

        const completedOrders = orders.filter(order => 
          order.status === 'completed'
        )

        const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0)
        const todayRevenue = todayOrders
          .filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + order.total_amount, 0)

        // Get unique customers
        const uniqueCustomers = new Set(orders.map(order => order.customer_email)).size

        setStats({
          totalOrders: orders.length,
          pendingOrders: pendingOrders.length,
          todayRevenue,
          totalRevenue,
          totalCustomers: uniqueCustomers,
          averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0
        })

        setRecentOrders(orders.slice(0, 10))
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'preparing':
        return <Package className="h-4 w-4" />
      case 'ready':
        return <CheckCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
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
      {/* Header - Hidden on mobile as it's in the layout */}
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to AT RESTAURANT Admin Panel</p>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={Package}
          trend="neutral"
        />

        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={Clock}
          trend={stats.pendingOrders > 5 ? 'up' : 'neutral'}
          change={stats.pendingOrders > 0 ? 'Needs attention' : 'All clear'}
        />

        <StatCard
          title="Today's Revenue"
          value={formatPrice(stats.todayRevenue)}
          icon={DollarSign}
          trend="up"
          period="Today"
        />

        <StatCard
          title="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          icon={TrendingUp}
          trend="up"
        />

        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
          trend="neutral"
        />

        <StatCard
          title="Avg Order Value"
          value={formatPrice(stats.averageOrderValue)}
          icon={CheckCircle}
          trend="neutral"
        />
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg sm:text-xl">Recent Orders</CardTitle>
          <Link href="/admin/orders">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className={`p-2 rounded-full flex-shrink-0 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-sm sm:text-base">#{order.id}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
                    <span className="font-semibold text-base sm:text-lg text-orange-600">
                      {formatPrice(order.total_amount)}
                    </span>
                    <Link href="/admin/orders">
                      <Button size="sm" variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions - Mobile Friendly */}
      {isMobile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/orders">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <ShoppingBag className="h-6 w-6 mb-2" />
                  <span className="text-xs">View Orders</span>
                </Button>
              </Link>
              <Link href="/admin/menu">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Package className="h-6 w-6 mb-2" />
                  <span className="text-xs">Manage Menu</span>
                </Button>
              </Link>
              <Link href="/admin/customers">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-xs">Customers</span>
                </Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-xs">Users</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}