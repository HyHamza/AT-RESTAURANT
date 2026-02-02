'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ImageWithModal } from '@/components/ui/image-modal'
import { useCart } from '@/contexts/cart-context'
import { formatPrice } from '@/lib/utils'
import { offlineUtils } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Minus, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import type { Category, MenuItem } from '@/types'
import { MenuSkeleton } from '@/components/skeletons/menu-skeleton'

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addItem, items: cartItems, updateQuantity } = useCart()

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    loadMenuData()
  }, [isOnline])

  const logError = (context: string, error: any) => {
    const errorMessage = `[AT RESTAURANT - ${context}] ${error?.message || error?.toString() || 'Unknown error'}`
    console.error(errorMessage)
    
    if (error?.details) {
      console.error(`[AT RESTAURANT - ${context}] Error details:`, error.details)
    }
    
    if (error?.hint) {
      console.error(`[AT RESTAURANT - ${context}] Error hint:`, error.hint)
    }
    
    if (error?.code) {
      console.error(`[AT RESTAURANT - ${context}] Error code:`, error.code)
    }
    
    return errorMessage
  }

  const checkSupabaseConnection = async () => {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not configured. Please check your .env.local file.')
    }
    
    // Test connection with a simple query
    try {
      const { data, error } = await supabase.from('categories').select('count').limit(1)
      
      if (error) {
        throw error
      }
      
      return true
    } catch (error) {
      throw error
    }
  }

  const loadMenuData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Always try to load cached data first for instant offline access
      const hasCached = await offlineUtils.hasCachedData()
      
      if (hasCached) {
        const { categories: cachedCategories, menuItems: cachedMenuItems } = await offlineUtils.getCachedMenuData()
        
        if (cachedCategories.length > 0 && cachedMenuItems.length > 0) {
          setCategories(cachedCategories)
          setMenuItems(cachedMenuItems.map(item => ({
            ...item,
            category: cachedCategories.find(cat => cat.id === item.category_id)
          })))
          
          setLoading(false)
          
          // If online, update cache in background
          if (isOnline) {
            updateCacheInBackground()
          }
          
          return
        }
      }
      
      // If no cached data and offline, show error
      if (!isOnline) {
        throw new Error('No cached data available and device is offline. Please connect to internet and refresh.')
      }

      // If online and no cache, fetch from server
      await fetchFromServer()

    } catch (error: any) {
      const errorMessage = logError('Menu Loading', error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchFromServer = async () => {
    // Check Supabase connection first
    await checkSupabaseConnection()

    const categoriesResponse = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (categoriesResponse.error) {
      throw new Error(`Categories fetch failed: ${categoriesResponse.error.message}`)
    }

    const menuItemsResponse = await supabase
      .from('menu_items')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('is_available', true)
      .order('sort_order')

    if (menuItemsResponse.error) {
      throw new Error(`Menu items fetch failed: ${menuItemsResponse.error.message}`)
    }

    if (!categoriesResponse.data || categoriesResponse.data.length === 0) {
      throw new Error('No categories found in database. Please add some categories first.')
    }

    if (!menuItemsResponse.data || menuItemsResponse.data.length === 0) {
      throw new Error('No menu items found in database. Please add some menu items first.')
    }

    setCategories(categoriesResponse.data)
    setMenuItems(menuItemsResponse.data)
    
    // Cache the data for offline use
    try {
      await offlineUtils.cacheMenuData(
        categoriesResponse.data,
        menuItemsResponse.data.map(item => ({
          ...item,
          category_name: item.category?.name,
          created_at: item.created_at || new Date().toISOString()
        }))
      )
    } catch (cacheError) {
      // Cache failed, but continue with loaded data
    }
  }

  const updateCacheInBackground = async () => {
    try {
      await fetchFromServer()
    } catch (error) {
      // Don't show error to user for background updates
    }
  }

  const loadCachedData = async () => {
    try {
      const hasCached = await offlineUtils.hasCachedData()
      
      if (!hasCached) {
        throw new Error('No cached data available. Please connect to internet and refresh.')
      }

      const { categories: cachedCategories, menuItems: cachedMenuItems } = await offlineUtils.getCachedMenuData()
      
      if (cachedCategories.length === 0 || cachedMenuItems.length === 0) {
        throw new Error('Cached data is empty. Please connect to internet and refresh.')
      }

      setCategories(cachedCategories)
      setMenuItems(cachedMenuItems.map(item => ({
        ...item,
        category: cachedCategories.find(cat => cat.id === item.category_id)
      })))

    } catch (error: any) {
      const errorMessage = logError('Cache Loading', error)
      setError(errorMessage)
      throw error
    }
  }

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCartItemQuantity = (itemId: string) => {
    const cartItem = cartItems.find(item => item.id === itemId)
    return cartItem?.quantity || 0
  }

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url
    })
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    updateQuantity(itemId, newQuantity)
  }

  if (loading) {
    return <MenuSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Menu</h2>
                <p className="text-gray-600 mb-4 text-sm">
                  {isOnline ? 'Unable to load menu data from server.' : 'Menu data is not available without an internet connection.'}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 text-sm font-mono break-all">
                    {error}
                  </p>
                </div>
                <div className="space-y-2 text-left text-sm text-gray-600 mb-6">
                  <p><strong>Troubleshooting steps:</strong></p>
                  <ol className="list-decimal list-inside space-y-1">
                    {isOnline ? (
                      <>
                        <li>Check your internet connection</li>
                        <li>Refresh the page</li>
                        <li>Contact support if the issue persists</li>
                      </>
                    ) : (
                      <>
                        <li>Connect to the internet</li>
                        <li>Refresh the page to load menu data</li>
                        <li>Menu will be available for future offline use</li>
                      </>
                    )}
                  </ol>
                </div>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Our Menu</h1>
              <p className="text-gray-600 mt-2">Discover our delicious offerings</p>
            </div>
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span className="text-sm">Connected</span>
                </div>
              ) : (
                <div className="flex items-center text-orange-600">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span className="text-sm">Connection unavailable</span>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories - Horizontal at top */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-3 rounded-full transition-colors font-medium ${
                  selectedCategory === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700'
                }`}
              >
                All Items ({menuItems.length})
              </button>
              {categories.map((category) => {
                const itemCount = menuItems.filter(item => item.category_id === category.id).length
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-6 py-3 rounded-full transition-colors font-medium ${
                      selectedCategory === category.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700'
                    }`}
                  >
                    {category.name} ({itemCount})
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Menu Items - Full width */}
        <div>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No items found matching your criteria.</p>
              {searchQuery && (
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your search or selecting a different category.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => {
                const quantity = getCartItemQuantity(item.id)
                
                return (
                  <Card key={item.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md">
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      {item.image_url ? (
                        <ImageWithModal
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="h-full bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                          <span className="text-gray-600 font-medium">No Image</span>
                        </div>
                      )}
                      {item.category && (
                        <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
                          {item.category.name}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold mb-2 line-clamp-1">{item.name}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-orange-500">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </div>

                      {quantity === 0 ? (
                        <Button
                          onClick={() => handleAddToCart(item)}
                          className="w-full bg-orange-500 hover:bg-orange-600 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(item.id, quantity - 1)}
                              className="rounded-lg hover:bg-red-50 hover:border-red-200"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-semibold text-lg min-w-[2rem] text-center">{quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(item.id, quantity + 1)}
                              className="rounded-lg hover:bg-green-50 hover:border-green-200"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <span className="text-sm text-gray-600 font-medium">
                            {formatPrice(item.price * quantity)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}