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
import { useToastHelpers } from '@/components/ui/toast'
import { Search, Plus, Minus, AlertCircle, Heart } from 'lucide-react'
import type { Category, MenuItem } from '@/types'
import { MenuSkeleton } from '@/components/skeletons/menu-skeleton'
import { BackButton } from '@/components/ui/back-button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const { addItem, items: cartItems, updateQuantity } = useCart()
  const toast = useToastHelpers()

  useEffect(() => {
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
    const timestamp = new Date().toISOString()
    const errorMessage = `[AT RESTAURANT - ${context}] ${timestamp} - ${error?.message || error?.toString() || 'Unknown error'}`
    console.error(errorMessage)
    
    if (error?.details) console.error(`[AT RESTAURANT - ${context}] Error details:`, error.details)
    if (error?.hint) console.error(`[AT RESTAURANT - ${context}] Error hint:`, error.hint)
    if (error?.code) console.error(`[AT RESTAURANT - ${context}] Error code:`, error.code)
    
    return errorMessage
  }

  const checkSupabaseConnection = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not configured. Please check your .env.local file.')
    }
    
    try {
      const { data, error } = await supabase.from('categories').select('count').limit(1)
      if (error) throw error
      return true
    } catch (error) {
      throw error
    }
  }

  const loadMenuData = async () => {
    setLoading(true)
    setError(null)
    
    try {
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
          
          if (isOnline) {
            updateCacheInBackground()
          }
          
          return
        }
      }
      
      if (!isOnline) {
        throw new Error('No cached data available and device is offline. Please connect to internet and refresh.')
      }

      await fetchFromServer()

    } catch (error: any) {
      const errorMessage = logError('Menu Loading', error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchFromServer = async () => {
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
      console.warn('[AT RESTAURANT - Menu] Failed to cache data:', cacheError)
    }
  }

  const updateCacheInBackground = async () => {
    try {
      await fetchFromServer()
    } catch (error) {
      console.warn('[AT RESTAURANT - Menu] Background cache update failed:', error)
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

  const handleAddToCart = async (item: MenuItem) => {
    setAddingToCart(item.id)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url
      })
      
      toast.success('Added to cart!', `${item.name} has been added to your cart`)
      console.log(`[AT RESTAURANT - Cart] Successfully added ${item.name} to cart`)
    } catch (error: any) {
      console.error(`[AT RESTAURANT - Cart] Failed to add ${item.name} to cart:`, error)
      toast.error('Failed to add item', 'Unable to add item to cart. Please try again.')
    } finally {
      setAddingToCart(null)
    }
  }

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      updateQuantity(itemId, newQuantity)
      console.log(`[AT RESTAURANT - Cart] Updated quantity for item ${itemId} to ${newQuantity}`)
    } catch (error: any) {
      console.error(`[AT RESTAURANT - Cart] Failed to update quantity:`, error)
      toast.error('Failed to update quantity', 'Unable to update item quantity. Please try again.')
    }
  }

  if (loading) {
    return <MenuSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pt-16">
        <div className="max-w-md w-full px-4">
          <Card className="card-white border-destructive/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="icon-pink-light mx-auto mb-4 bg-red-50">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-dark mb-2">Unable to Load Menu</h2>
                <p className="text-muted-text mb-4 text-sm">
                  {isOnline ? 'Unable to load menu data from server.' : 'Menu data is not available without an internet connection.'}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-destructive text-sm font-mono break-all">
                    {error}
                  </p>
                </div>
                <div className="space-y-2 text-left text-sm text-muted-text mb-6">
                  <p className="text-dark font-medium">What you can do:</p>
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
                  className="w-full btn-pink-primary"
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
    <div className="min-h-screen bg-white pt-16">
      {/* Header */}
      <div className="bg-gray-light border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Button and Breadcrumbs */}
          <div className="mb-4">
            <BackButton href="/" label="Back to Home" />
          </div>
          <Breadcrumbs items={[{ label: 'Menu' }]} className="mb-4" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-dark heading-clean">Our Menu</h1>
              <p className="text-muted-text mt-1">Discover our delicious offerings</p>
            </div>
            {!isOnline && (
              <div className="bg-white rounded-lg px-3 py-2 border border-pink-primary/20">
                <p className="text-pink-primary text-sm font-medium">Offline Mode</p>
              </div>
            )}
          </div>
          
          {/* Search */}
          <div className="mt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-text h-5 w-5" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-clean pl-12 h-12 text-base rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content Area */}
        <div className="flex-1 pr-12 sm:pr-16 pb-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Selected Category Title */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-dark">
                {selectedCategory === 'all' 
                  ? 'All Items' 
                  : categories.find(cat => cat.id === selectedCategory)?.name || 'Menu Items'
                }
              </h2>
              <p className="text-muted-text text-sm mt-1">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} available
              </p>
            </div>

            {/* Menu Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="icon-pink-light mx-auto mb-4">
                  <Search className="h-8 w-8 text-pink-primary" />
                </div>
                <h3 className="text-xl font-semibold text-dark mb-2">No items found</h3>
                <p className="text-muted-text mb-6">
                  {searchQuery 
                    ? `No menu items match "${searchQuery}". Try adjusting your search or selecting a different category.`
                    : selectedCategory !== 'all' 
                      ? `No items available in the selected category.`
                      : 'No menu items are currently available.'
                  }
                </p>
                {(searchQuery || selectedCategory !== 'all') && (
                  <Button 
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('all')
                    }}
                    variant="outline"
                    className="btn-white-outline"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => {
                  const quantity = getCartItemQuantity(item.id)
                  
                  return (
                    <Card key={item.id} className="menu-card group">
                      <div className="menu-card-image">
                        {item.image_url ? (
                          <>
                            <ImageWithModal
                              src={item.image_url}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-clean">
                              <Heart className="h-4 w-4 text-pink-primary hover:fill-pink-primary" />
                            </button>
                            {item.category && (
                              <div className="absolute top-3 left-3 badge-pink z-10">
                                {item.category.name}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="h-full bg-gray-light flex items-center justify-center">
                            <span className="text-muted-text font-medium">No Image</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-6">
                        <div className="mb-4">
                          <h3 className="text-xl font-semibold text-dark mb-2 line-clamp-1">{item.name}</h3>
                          <p className="text-muted-text text-sm mb-3 line-clamp-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-pink-primary">
                              {formatPrice(item.price)}
                            </span>
                          </div>
                        </div>

                        {quantity === 0 ? (
                          <Button
                            onClick={() => handleAddToCart(item)}
                            disabled={addingToCart === item.id}
                            className="w-full btn-pink-primary rounded-lg font-medium disabled:opacity-50"
                          >
                            {addingToCart === item.id ? (
                              <div className="flex items-center justify-center">
                                <LoadingSpinner size="sm" variant="white" className="mr-2" />
                                Adding...
                              </div>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add to Cart
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleUpdateQuantity(item.id, quantity - 1)}
                                className="rounded-lg hover:bg-red-50 hover:border-red-200 border-border"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-semibold text-lg min-w-[2rem] text-center text-dark">{quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleUpdateQuantity(item.id, quantity + 1)}
                                className="rounded-lg hover:bg-pink-light hover:border-pink-primary/20 border-border"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <span className="text-sm text-muted-text font-medium">
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

        {/* RIGHT Sidebar - Emoji Filters */}
        <div className="fixed right-0 top-16 h-full bg-gray-light w-12 sm:w-16 z-10 flex flex-col items-center py-4 sm:py-6 overflow-y-auto scrollbar-clean border-l border-border">
          <div className="flex flex-col items-center space-y-2 sm:space-y-4 w-full">
            {/* All Categories */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-2xl transition-smooth ${
                selectedCategory === 'all'
                  ? 'bg-pink-gradient shadow-pink'
                  : 'bg-white hover:bg-pink-light border border-border'
              }`}
              title="All Items"
            >
              🍽️
            </button>

            {/* Dynamic Categories with Emojis */}
            {categories.map((category) => {
              const getEmojiForCategory = (category: Category) => {
                if (category.emoji) return category.emoji
                
                const lowerName = category.name.toLowerCase()
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
                  className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-2xl transition-smooth ${
                    selectedCategory === category.id
                      ? 'bg-pink-gradient shadow-pink'
                      : 'bg-white hover:bg-pink-light border border-border'
                  }`}
                  title={category.name}
                >
                  {getEmojiForCategory(category)}
                </button>
              )
            })}
          </div>
          
          {/* Scroll indicator for mobile */}
          <div className="sm:hidden mt-2 flex flex-col items-center space-y-1">
            <div className="w-1 h-8 bg-border rounded-full opacity-50"></div>
            <div className="text-muted-text text-xs rotate-90 whitespace-nowrap">Scroll</div>
          </div>
        </div>
      </div>
    </div>
  )
}
