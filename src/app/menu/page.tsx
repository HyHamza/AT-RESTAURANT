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
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Our Menu</h1>
              <p className="text-gray-600 mt-1">Discover our delicious offerings</p>
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
          
          {/* Search - Mobile optimized */}
          <div className="mt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content Area */}
        <div className="flex-1 pr-16 pb-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Selected Category Title */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedCategory === 'all' 
                  ? 'All Items' 
                  : categories.find(cat => cat.id === selectedCategory)?.name || 'Menu Items'
                }
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} available
              </p>
            </div>

            {/* Menu Items Grid */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

        {/* RIGHT Sidebar - Emoji Filters (All screen sizes) - Like your mobile app reference */}
        <div className="fixed right-0 top-16 h-full bg-gray-900 w-16 z-10 flex flex-col items-center py-6 space-y-4 overflow-y-auto">
          {/* All Categories */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-orange-500 shadow-lg'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="All Items"
          >
            🍽️
          </button>

          {/* Dynamic Categories with Emojis */}
          {categories.map((category) => {
            const getEmojiForCategory = (name: string) => {
              const lowerName = name.toLowerCase()
              if (lowerName.includes('pizza')) return '🍕'
              if (lowerName.includes('burger')) return '🍔'
              if (lowerName.includes('chicken') || lowerName.includes('meat')) return '🍗'
              if (lowerName.includes('sandwich') || lowerName.includes('sub')) return '🥪'
              if (lowerName.includes('salad')) return '🥗'
              if (lowerName.includes('pasta')) return '🍝'
              if (lowerName.includes('dessert') || lowerName.includes('sweet')) return '🍰'
              if (lowerName.includes('drink') || lowerName.includes('beverage')) return '🥤'
              if (lowerName.includes('coffee')) return '☕'
              if (lowerName.includes('ice cream')) return '🍦'
              if (lowerName.includes('soup')) return '🍲'
              if (lowerName.includes('seafood') || lowerName.includes('fish')) return '🐟'
              if (lowerName.includes('vegetarian') || lowerName.includes('vegan')) return '🥬'
              if (lowerName.includes('breakfast')) return '🍳'
              if (lowerName.includes('snack')) return '🍿'
              return '🍴'
            }

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-orange-500 shadow-lg'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={category.name}
              >
                {getEmojiForCategory(category.name)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}