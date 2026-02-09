'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ImageWithModal } from '@/components/ui/image-modal'
import { VideoBackground } from '@/components/ui/video-background'
import { ParallaxHero } from '@/components/ui/parallax-hero'
import { Search, Plus, Star, Clock, MapPin, ArrowRight, Heart } from 'lucide-react'
import { HomepageSkeleton } from '@/components/skeletons/homepage-skeleton'
import { supabase } from '@/lib/supabase'
import { offlineUtils } from '@/lib/offline-db'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/contexts/cart-context'
import { useToastHelpers } from '@/components/ui/toast'
import type { MenuItem, Category } from '@/types'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const { addItem } = useCart()
  const toast = useToastHelpers()

  useEffect(() => {
    loadMenuData()
  }, [])

  const logError = (context: string, error: any) => {
    const timestamp = new Date().toISOString()
    const errorMessage = `[AT RESTAURANT - ${context}] ${timestamp} - ${error?.message || error?.toString() || 'Unknown error'}`
    console.error(errorMessage)
    
    if (error?.details) console.error(`[AT RESTAURANT - ${context}] Error details:`, error.details)
    if (error?.hint) console.error(`[AT RESTAURANT - ${context}] Error hint:`, error.hint)
    if (error?.code) console.error(`[AT RESTAURANT - ${context}] Error code:`, error.code)
    
    return errorMessage
  }

  const loadMenuData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Check if we're online
      const isOnline = navigator.onLine
      
      if (!isOnline) {
        // Try to load from IndexedDB when offline
        console.log('[AT RESTAURANT - Homepage] Offline mode detected, loading from cache...')
        const { categories: cachedCategories, menuItems: cachedMenuItems } = await offlineUtils.getCachedMenuData()
        
        if (cachedCategories.length > 0 && cachedMenuItems.length > 0) {
          console.log(`[AT RESTAURANT - Homepage] Loaded ${cachedCategories.length} categories and ${cachedMenuItems.length} items from cache`)
          setCategories(cachedCategories)
          setMenuItems(cachedMenuItems)
          toast.info('Offline Mode', 'Showing cached menu data. Some items may be outdated.')
          return
        } else {
          throw new Error('No cached menu data available. Please connect to the internet to load the menu.')
        }
      }

      // Online: Fetch from Supabase
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (categoriesError) throw new Error(`Categories fetch failed: ${categoriesError.message}`)

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('is_available', true)
        .order('sort_order', { ascending: true })

      if (menuError) throw new Error(`Menu items fetch failed: ${menuError.message}`)

      if (!categoriesData || categoriesData.length === 0) {
        throw new Error('No categories found. Please add some categories from the admin panel.')
      }

      if (!menuData || menuData.length === 0) {
        throw new Error('No menu items found. Please add some menu items from the admin panel.')
      }

      setCategories(categoriesData)
      setMenuItems(menuData)
      
      // Cache the data for offline use (fire-and-forget)
      offlineUtils.cacheMenuData(
        categoriesData,
        menuData.map(item => ({
          ...item,
          category_name: item.category?.name,
          created_at: item.created_at || new Date().toISOString()
        }))
      ).catch(err => {
        console.warn('[AT RESTAURANT - Homepage] Failed to cache menu data:', err)
      })
      
    } catch (error: any) {
      const errorMessage = logError('Homepage Menu Loading', error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
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

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return <HomepageSkeleton />
  }

  if (error) {
    const isOffline = !navigator.onLine
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Card className="card-white border-destructive/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
                  <span className="text-destructive text-2xl">{isOffline ? '📡' : '⚠️'}</span>
                </div>
                <h2 className="text-xl font-semibold text-dark mb-2">
                  {isOffline ? 'You\'re Offline' : 'Unable to Load Menu'}
                </h2>
                <p className="text-muted-text mb-4 text-sm">
                  {isOffline 
                    ? 'No cached menu data available. Please connect to the internet to load the menu.'
                    : 'We\'re having trouble loading the menu right now.'
                  }
                </p>
                {!isOffline && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-destructive text-sm font-mono break-all">
                      {error}
                    </p>
                  </div>
                )}
                <div className="space-y-2 text-left text-sm text-muted-text mb-6">
                  <p><strong>What you can do:</strong></p>
                  <ol className="list-decimal list-inside space-y-1">
                    {isOffline ? (
                      <>
                        <li>Check your internet connection</li>
                        <li>Turn off airplane mode if enabled</li>
                        <li>Try again once you're back online</li>
                      </>
                    ) : (
                      <>
                        <li>Check your internet connection</li>
                        <li>Refresh the page</li>
                        <li>Contact support if the issue persists</li>
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
    <div className="min-h-screen bg-white">
      {/* Hero Section - Professional Pink & White with Video */}
      <ParallaxHero className="relative overflow-hidden min-h-screen">
        {/* Video Background with professional pink/white overlay */}
        <VideoBackground 
          src="/assets/videos/hero.mp4"
          blur={0}
          overlayOpacity={0.4}
        />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 min-h-screen flex items-center z-10">
          <div className="text-center max-w-4xl mx-auto w-full fade-in-up">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-dark">
              Fresh Food,
              <br />
              <span style={{ 
                background: 'linear-gradient(135deg, hsl(337, 80%, 50%) 0%, hsl(337, 80%, 60%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Delivered Fast
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto" style={{ color: 'hsl(330, 23%, 26%)' }}>
              Order your favorite meals and get them delivered to your doorstep in minutes
            </p>
            
            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 px-4">
              <Button 
                size="lg" 
                className="btn-pink-primary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl w-full sm:w-auto min-h-[48px]"
                asChild
              >
                <Link href="/menu" className="flex items-center justify-center">
                  View Menu
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="btn-white-outline px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl w-full sm:w-auto min-h-[48px]"
                asChild
              >
                <Link href="/order-status" className="flex items-center justify-center">
                  Track Order
                </Link>
              </Button>
            </div>

            {/* Quick Stats - Clean White Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center card-white rounded-2xl p-6 hover-lift">
                <div className="text-3xl font-bold text-pink-primary">30min</div>
                <div className="text-sm text-muted-text mt-2">Average Delivery</div>
              </div>
              <div className="text-center card-white rounded-2xl p-6 hover-lift">
                <div className="text-3xl font-bold text-pink-primary">4.8★</div>
                <div className="text-sm text-muted-text mt-2">Customer Rating</div>
              </div>
              <div className="text-center card-white rounded-2xl p-6 hover-lift">
                <div className="text-3xl font-bold text-pink-primary">{menuItems.length}+</div>
                <div className="text-sm text-muted-text mt-2">Delicious Dishes</div>
              </div>
            </div>
          </div>
        </div>
      </ParallaxHero>

      {/* Menu Discovery Section - Light Gray Background */}
      <section className="py-16 section-gray-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4 heading-clean">
              Explore Our Menu
            </h2>
            <p className="text-lg text-muted-text max-w-2xl mx-auto">
              Discover our carefully curated selection of delicious dishes
            </p>
            <div className="divider-pink mt-6 max-w-xs mx-auto"></div>
          </div>

          {/* Search */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-text h-5 w-5" />
              <Input
                placeholder="Search for dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-clean pl-12 pr-4 py-4 text-lg rounded-xl"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-12">
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-3 rounded-full font-medium transition-smooth ${
                  selectedCategory === 'all'
                    ? 'btn-pink-primary'
                    : 'bg-white text-dark hover:bg-pink-light border border-border'
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
                    className={`px-6 py-3 rounded-full font-medium transition-smooth ${
                      selectedCategory === category.id
                        ? 'btn-pink-primary'
                        : 'bg-white text-dark hover:bg-pink-light border border-border'
                    }`}
                  >
                    {category.name} ({itemCount})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <Card key={item.id} className="menu-card group">
                  <div className="menu-card-image">
                    {item.image_url ? (
                      <>
                        <ImageWithModal
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
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
                  <CardContent className="p-4 bg-white">
                    <h3 className="font-bold text-lg text-dark mb-2 line-clamp-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-muted-text text-sm mb-3 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-pink-primary">{formatPrice(item.price)}</span>
                      <Button 
                        size="sm" 
                        onClick={() => handleAddToCart(item)}
                        disabled={addingToCart === item.id}
                        className="btn-pink-primary rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                      >
                        {addingToCart === item.id ? (
                          <div className="flex items-center">
                            <div className="spinner-pink h-4 w-4 mr-1"></div>
                            Adding...
                          </div>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="w-24 h-24 bg-gray-light rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                  <Search className="h-12 w-12 text-muted-text" />
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
            )}
          </div>

          {/* View Full Menu CTA */}
          {filteredItems.length > 0 && (
            <div className="text-center mt-12 px-4">
              <Button 
                size="lg" 
                className="btn-pink-primary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl w-full sm:w-auto min-h-[48px]"
                asChild
              >
                <Link href="/menu" className="flex items-center justify-center">
                  Explore Full Menu
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us - White Background */}
      <section className="py-16 section-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4 heading-clean">
              Why Choose Us
            </h2>
            <p className="text-muted-text max-w-2xl mx-auto">
              Discover what makes us the preferred choice for food lovers
            </p>
            <div className="divider-pink mt-6 max-w-xs mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center card-white p-8 rounded-xl hover-lift">
              <div className="icon-pink mx-auto mb-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Fast Delivery</h3>
              <p className="text-muted-text">Get your food delivered in an average of 30 minutes</p>
            </div>
            <div className="text-center card-white p-8 rounded-xl hover-lift">
              <div className="icon-pink mx-auto mb-4">
                <Star className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Quality Food</h3>
              <p className="text-muted-text">Fresh ingredients prepared by expert chefs</p>
            </div>
            <div className="text-center card-white p-8 rounded-xl hover-lift">
              <div className="icon-pink mx-auto mb-4">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Multiple Locations</h3>
              <p className="text-muted-text">Serving you from convenient locations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Pink Gradient */}
      <section className="py-20 bg-pink-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Ready to Order?
          </h2>
          <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-2xl mx-auto">
            Delicious food is just a few clicks away
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Button 
              size="lg" 
              className="bg-white text-pink-primary hover:bg-gray-100 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl w-full sm:w-auto min-h-[48px] shadow-clean-lg"
              asChild
            >
              <Link href="/menu" className="flex items-center justify-center">
                Order Now
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-pink-primary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl w-full sm:w-auto min-h-[48px] bg-white/10 backdrop-blur-sm"
              asChild
            >
              <Link href="/location" className="flex items-center justify-center">
                <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Find Location
              </Link>
            </Button>
          </div>
          
          {/* Additional info */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto text-sm text-white">
            <div className="flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Clock className="h-4 w-4 mr-2" />
              <span>30min delivery</span>
            </div>
            <div className="flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Star className="h-4 w-4 mr-2" />
              <span>4.8★ rated</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
