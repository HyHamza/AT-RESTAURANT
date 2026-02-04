'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ImageWithModal } from '@/components/ui/image-modal'
import { Search, Plus, Star, Clock, MapPin, ArrowRight, Filter, Heart } from 'lucide-react'
import { HomepageSkeleton } from '@/components/skeletons/homepage-skeleton'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/contexts/cart-context'
import type { MenuItem, Category } from '@/types'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { addItem } = useCart()

  useEffect(() => {
    loadMenuData()
  }, [])

  const loadMenuData = async () => {
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (categoriesError) {
        console.error('[AT RESTAURANT - Homepage] Error loading categories:', categoriesError)
      } else {
        setCategories(categoriesData || [])
      }

      // Load menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('is_available', true)
        .order('sort_order', { ascending: true })

      if (menuError) {
        console.error('[AT RESTAURANT - Homepage] Error loading menu items:', menuError)
      } else {
        setMenuItems(menuData || [])
      }
    } catch (error) {
      console.error('[AT RESTAURANT - Homepage] Failed to load menu data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url
    })
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Customer-focused, minimal */}
      <section className="bg-gradient-to-br from-orange-500 via-red-500 to-red-600 text-white relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 min-h-screen flex items-center">
          <div className="text-center max-w-4xl mx-auto w-full">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Fresh Food,
              <br />
              <span className="text-orange-200">Fast Delivery</span>
            </h1>
            <p className="text-xl md:text-2xl text-orange-100 mb-8 max-w-2xl mx-auto">
              Discover delicious meals made with fresh ingredients. Order now and get it delivered in 30 minutes.
            </p>
            
            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 px-4">
              <Button 
                size="lg" 
                className="bg-white text-red-600 hover:bg-gray-100 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto min-h-[48px]"
                asChild
              >
                <Link href="/menu" className="flex items-center justify-center">
                  View Full Menu
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-red-600 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl transition-all w-full sm:w-auto min-h-[48px] bg-transparent"
                asChild
              >
                <Link href="/order-status" className="flex items-center justify-center">
                  Track Your Order
                </Link>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-200">30min</div>
                <div className="text-sm text-orange-100">Average Delivery</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-200">4.8★</div>
                <div className="text-sm text-orange-100">Customer Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-200">50+</div>
                <div className="text-sm text-orange-100">Menu Items</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Discovery Section - The main focus */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What would you like to eat?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Browse our menu and discover your next favorite meal
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search for dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-0"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-12">
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-3 rounded-full font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-orange-500 text-white shadow-lg'
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
                    className={`px-6 py-3 rounded-full font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700'
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
                <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden">
                  <div className="relative h-48 overflow-hidden bg-gray-100">
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
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Heart className="h-4 w-4 text-gray-600 hover:text-red-500" />
                    </button>
                    {item.category && (
                      <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
                        {item.category.name}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-600">{formatPrice(item.price)}</span>
                      <Button 
                        size="sm" 
                        onClick={() => handleAddToCart(item)}
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 font-medium shadow-sm hover:shadow-md transition-all"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Fallback items if no database items
              [
                { name: "Signature Burger", price: 12.99, category: "Burgers", image: "/assets/food/Delicious.jpg" },
                { name: "Margherita Pizza", price: 14.99, category: "Pizza", image: null },
                { name: "Caesar Salad", price: 9.99, category: "Salads", image: null },
                { name: "Chicken Wings", price: 11.99, category: "Appetizers", image: null },
                { name: "Pasta Carbonara", price: 13.99, category: "Pasta", image: null },
                { name: "Fish & Chips", price: 15.99, category: "Mains", image: null },
                { name: "Chocolate Cake", price: 6.99, category: "Desserts", image: null },
                { name: "Fresh Smoothie", price: 5.99, category: "Beverages", image: null }
              ].map((item, index) => (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden">
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    {item.image ? (
                      <ImageWithModal
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="h-full bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <span className="text-gray-600 font-medium">Coming Soon</span>
                      </div>
                    )}
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Heart className="h-4 w-4 text-gray-600 hover:text-red-500" />
                    </button>
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
                      {item.category}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{item.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">Delicious and freshly prepared</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-600">${item.price}</span>
                      <Button 
                        size="sm" 
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 font-medium shadow-sm hover:shadow-md transition-all"
                        asChild
                      >
                        <Link href="/menu">
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* View Full Menu CTA */}
          <div className="text-center mt-12 px-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto min-h-[48px]"
              asChild
            >
              <Link href="/menu" className="flex items-center justify-center">
                View Full Menu
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Minimal, focused */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why customers love us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-gray-600">Average delivery time of 30 minutes or less</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Quality Food</h3>
              <p className="text-gray-600">Fresh ingredients and expert preparation</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Multiple Locations</h3>
              <p className="text-gray-600">Find us at convenient locations near you</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Simple and direct */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-red-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to order?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-2xl mx-auto">
            Get your favorite food delivered fresh and fast to your doorstep
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Button 
              size="lg" 
              className="btn-hero-primary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto min-h-[48px]"
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
              className="btn-hero-secondary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl transition-all w-full sm:w-auto min-h-[48px]"
              asChild
            >
              <Link href="/location" className="flex items-center justify-center">
                <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Find Location
              </Link>
            </Button>
          </div>
          
          {/* Additional info */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto text-sm opacity-80">
            <div className="flex items-center justify-center">
              <Clock className="h-4 w-4 mr-2" />
              <span>30min delivery</span>
            </div>
            <div className="flex items-center justify-center">
              <Star className="h-4 w-4 mr-2" />
              <span>4.8★ rated</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}