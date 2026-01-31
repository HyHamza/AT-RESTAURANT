'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOffline } from '@/hooks/use-offline'
import { 
  WifiOff, 
  RefreshCw, 
  Menu as MenuIcon, 
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Wifi
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

function OfflinePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
          <Skeleton className="h-9 w-48 mx-auto mb-2" />
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center p-4 border rounded-lg">
                  <Skeleton className="h-8 w-12 mx-auto mb-2" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function OfflinePage() {
  const [loading, setLoading] = useState(true)
  const { isOnline, pendingOrders, cacheStats } = useOffline()

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <OfflinePageSkeleton />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connection Unavailable</h1>
          <p className="text-gray-600">All features remain fully accessible</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-gray-500" />
                )}
                <span>Connection Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                {isOnline ? (
                  <div>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">Connected</h3>
                    <p className="text-green-700">All features are available</p>
                  </div>
                ) : (
                  <div>
                    <WifiOff className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Unavailable</h3>
                    <p className="text-gray-600">All features remain accessible</p>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/menu" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <MenuIcon className="h-4 w-4 mr-2" />
                    Browse Menu
                  </Button>
                </Link>
                
                <Link href="/order" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View Cart
                  </Button>
                </Link>
                
                <Link href="/order-status" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Order Status
                  </Button>
                </Link>
                
                <Link href="/settings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cache Statistics */}
        {cacheStats && (
          <Card>
            <CardHeader>
              <CardTitle>Available Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{cacheStats.categories}</div>
                  <div className="text-sm text-gray-600">Categories</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{cacheStats.menuItems}</div>
                  <div className="text-sm text-gray-600">Menu Items</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{cacheStats.pendingOrders}</div>
                  <div className="text-sm text-gray-600">Pending Orders</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{cacheStats.cachedAssets}</div>
                  <div className="text-sm text-gray-600">Cached Assets</div>
                </div>
              </div>

              {pendingOrders > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-orange-900">
                      {pendingOrders} orders awaiting synchronization
                    </span>
                  </div>
                  <p className="text-sm text-orange-700">
                    Orders will be submitted automatically when internet connection is restored.
                  </p>
                </div>
              )}

              {cacheStats.lastCacheUpdate && (
                <div className="text-sm text-gray-500 text-center mt-4">
                  Data last updated: {new Date(cacheStats.lastCacheUpdate).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Enhanced Offline Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-green-900">✓ Available Without Connection</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Browse menu items and categories</li>
                  <li>• Add items to cart and place orders</li>
                  <li>• View order history and status</li>
                  <li>• Navigate all application pages</li>
                  <li>• Access all stored content</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 text-blue-900">⚡ Automatic Synchronization</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Orders sync when connection restored</li>
                  <li>• Menu data updates automatically</li>
                  <li>• No data loss occurs</li>
                  <li>• Seamless connectivity transitions</li>
                  <li>• Background sync every 30 seconds</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}