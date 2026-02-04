'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'
import { User, Package, Clock, CheckCircle, LogOut, ShoppingBag, Settings } from 'lucide-react'
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton'
import Link from 'next/link'
import type { Order } from '@/types'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      setUser(session.user)
      await loadUserOrders(session.user.id)
    } catch (error) {
      console.error('[AT RESTAURANT - Dashboard] Auth check error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadUserOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`user_id.eq.${userId},customer_email.eq.${user?.email}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Orders fetch error:', error)
        return
      }

      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'preparing':
        return <Package className="h-4 w-4 text-blue-600" />
      case 'ready':
        return <ShoppingBag className="h-4 w-4 text-green-600" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-700" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
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

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Welcome back, {user?.user_metadata?.full_name || user?.email}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Link href="/settings" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-12 text-base">
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </Button>
            </Link>
            <Link href="/menu" className="w-full sm:w-auto">
              <Button className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto h-12 text-base">
                Order Food
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto h-12 text-base">
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* User Profile */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <User className="h-5 w-5 mr-2" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900 mt-1">{user?.user_metadata?.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900 mt-1 break-all">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900 mt-1">{user?.user_metadata?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Member Since</label>
                    <p className="text-gray-900 mt-1">{formatDate(user?.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Orders</span>
                    <span className="font-semibold text-lg">{orders.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completed Orders</span>
                    <span className="font-semibold text-lg">
                      {orders.filter(order => order.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Spent</span>
                    <span className="font-semibold text-orange-500 text-lg">
                      {formatPrice(orders.reduce((sum, order) => sum + order.total_amount, 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order History */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order History</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-600 mb-6 px-4">Start by ordering some delicious food from our menu!</p>
                    <Link href="/menu">
                      <Button className="bg-orange-500 hover:bg-orange-600 h-12 px-8 text-base">
                        Browse Menu
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(order.status)}
                            <div>
                              <h3 className="font-semibold">Order #{order.id}</h3>
                              <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:text-right sm:block">
                            <p className="font-semibold text-lg">{formatPrice(order.total_amount)}</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        
                        {order.notes && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">
                              <strong>Notes:</strong> {order.notes}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                          <div className="text-sm text-gray-600">
                            <span>Customer: {order.customer_name}</span>
                          </div>
                          <Link href={`/order-status?id=${order.id}`}>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto h-10">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}