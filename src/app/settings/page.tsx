'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOffline } from '@/hooks/use-offline'
import { useToastHelpers } from '@/components/ui/toast'
import { 
  Settings as SettingsIcon,
  Database,
  Wifi,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Smartphone
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center space-x-3 mb-8">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="card-white">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>

          <Card className="card-white">
            <CardHeader>
              <Skeleton className="h-6 w-28" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center p-3 border border-border rounded-lg">
                    <Skeleton className="h-8 w-12 mx-auto mb-2" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-4 w-48 mx-auto" />
            </CardContent>
          </Card>
        </div>

        <Card className="card-white mt-8">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full mb-6" />
            <div className="border-t border-border pt-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="p-4 border border-red-200 rounded-lg bg-red-50 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-12 w-64" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const toast = useToastHelpers()
  const {
    isOnline,
    pendingOrders,
    cacheStats,
    forceSyncOrders,
    clearOfflineData,
    refreshCacheStats
  } = useOffline()

  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  const handleForcSync = async () => {
    setSyncing(true)
    try {
      const result = await forceSyncOrders()
      toast.success('Synchronization Complete', `${result.success} orders synced successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`)
    } catch (error) {
      toast.error('Synchronization Failed', 'Please check your connection and try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all application data? This will remove:\n\n• All cached menu items and categories\n• All pending orders (they will be lost permanently)\n• All cached images and assets\n• All synchronization logs\n\nThis action cannot be undone.')) {
      return
    }

    setClearing(true)
    try {
      await clearOfflineData()
      toast.success('Data Cleared', 'Application data has been cleared successfully.')
    } catch (error) {
      toast.error('Clear Failed', 'Unable to clear application data. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  const handleRefreshStats = async () => {
    setRefreshing(true)
    try {
      await refreshCacheStats()
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return <SettingsSkeleton />
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center space-x-3 mb-6 sm:mb-8">
          <SettingsIcon className="h-7 w-7 sm:h-8 sm:w-8 text-pink-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-dark">Settings</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* App Status */}
          <Card className="card-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Smartphone className="h-5 w-5" />
                <span>App Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <span className="font-medium text-sm sm:text-base">Network Status</span>
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 text-sm sm:text-base">Online</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-muted-text" />
                      <span className="text-muted-text text-sm">Connection unavailable</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <span className="font-medium text-sm sm:text-base">Pending Orders</span>
                <div className="flex items-center space-x-2">
                  {pendingOrders > 0 ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-pink-primary" />
                      <span className="text-pink-primary text-sm sm:text-base">{pendingOrders}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 text-sm sm:text-base">0</span>
                    </>
                  )}
                </div>
              </div>

              {isOnline && pendingOrders > 0 && (
                <Button
                  onClick={handleForcSync}
                  disabled={syncing}
                  className="btn-pink-primary w-full h-12 text-base"
                >
                  {syncing ? (
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-5 w-5 mr-2" />
                  )}
                  Synchronize Pending Orders
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Cache Statistics */}
          <Card className="card-white">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span className="text-lg">Offline Data</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshStats}
                  disabled={refreshing}
                  className="h-10 px-3 border-2 border-border hover:border-pink-primary hover:text-pink-primary"
                >
                  {refreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cacheStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-4 border border-border rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-pink-primary">{cacheStats.categories}</div>
                      <div className="text-xs sm:text-sm text-muted-text">Categories</div>
                    </div>
                    
                    <div className="text-center p-4 border border-border rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">{cacheStats.menuItems}</div>
                      <div className="text-xs sm:text-sm text-muted-text">Menu Items</div>
                    </div>
                    
                    <div className="text-center p-4 border border-border rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-pink-primary">{cacheStats.pendingOrders}</div>
                      <div className="text-xs sm:text-sm text-muted-text">Pending Orders</div>
                    </div>
                    
                    <div className="text-center p-4 border border-border rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-pink-primary">{cacheStats.cachedAssets}</div>
                      <div className="text-xs sm:text-sm text-muted-text">Cached Assets</div>
                    </div>
                  </div>

                  {cacheStats.lastCacheUpdate && (
                    <div className="text-xs sm:text-sm text-muted-text text-center">
                      Last updated: {new Date(cacheStats.lastCacheUpdate).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-text py-8">
                  Loading cache statistics...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Offline Information */}
        <Card className="card-white mt-6 sm:mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Offline Functionality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900 mb-2">Enhanced Offline Experience</h4>
                  <p className="text-sm text-green-700">
                    Orders can be placed when internet connection is unavailable. All functionality 
                    remains accessible, and orders will automatically sync when connection is restored.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Available Without Connection</h3>
                <ul className="text-sm text-muted-text space-y-2">
                  <li>• Browse menu and view items</li>
                  <li>• Place orders and manage cart</li>
                  <li>• Access order history</li>
                  <li>• Use all application features</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base">Automatic Synchronization</h3>
                <ul className="text-sm text-muted-text space-y-2">
                  <li>• Orders sync when connection restored</li>
                  <li>• Menu data updates automatically</li>
                  <li>• No data loss occurs</li>
                  <li>• Seamless connectivity transitions</li>
                </ul>
              </div>
            </div>

            {/* Data Management */}
            <div className="border-t border-border pt-6">
              <h3 className="font-semibold mb-4 text-red-600 text-base">Data Management</h3>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-red-200 rounded-lg bg-red-50 space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800 mb-1">Clear Application Data</h4>
                    <p className="text-sm text-red-600">
                      Permanently removes all cached data and pending orders. Use only if experiencing technical issues.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleClearData}
                    disabled={clearing}
                    className="w-full sm:w-auto h-12 text-base sm:ml-4"
                  >
                    {clearing ? (
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5 mr-2" />
                    )}
                    Clear Data
                  </Button>
                </div>

                <div className="text-sm text-muted-text p-4 bg-gray-light rounded-lg">
                  <strong>Important:</strong> Clearing application data will remove all cached menu items, 
                  pending orders, and stored assets. Ensure all orders have been synchronized before proceeding.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}