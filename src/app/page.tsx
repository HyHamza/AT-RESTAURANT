'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Clock, MapPin, Phone, ArrowRight, Play } from 'lucide-react'
import { HomepageSkeleton } from '@/components/skeletons/homepage-skeleton'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/contexts/cart-context'
import type { MenuItem } from '@/types'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [popularDishes, setPopularDishes] = useState<MenuItem[]>([])
  const { addItem } = useCart()

  useEffect(() => {
    loadPopularDishes()
  }, [])

  const loadPopularDishes = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('sort_order', { ascending: true })
        .limit(6)

      if (error) {
        console.error('[AT RESTAURANT - Homepage] Error loading dishes:', error)
        return
      }

      setPopularDishes(data || [])
    } catch (error) {
      console.error('[AT RESTAURANT - Homepage] Failed to load popular dishes:', error)
    } finally {
      // Simulate loading time for better UX
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    }
  }

  const handleAddToCart = (dish: MenuItem) => {
    addItem({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      image_url: dish.image_url
    })
  }

  if (loading) {
    return <HomepageSkeleton />
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section - Matching Foodie Design */}
      <section className="relative min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-800 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"></div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-yellow-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-6 h-6 bg-orange-400 rounded-full opacity-40 animate-bounce"></div>
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-yellow-300 rounded-full opacity-50"></div>
        <div className="absolute bottom-60 right-40 w-5 h-5 bg-orange-300 rounded-full opacity-30 animate-pulse"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-8rem)]">
            {/* Left Content */}
            <div className="text-center lg:text-left text-white">
              <div className="inline-block text-orange-300 text-lg font-medium mb-4 tracking-wide">
                Eat Sleep And
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Supper delicious
                <br />
                <span className="text-orange-300">Burger</span> in town!
              </h1>
              
              <p className="text-lg md:text-xl text-red-100 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Food is any substance consumed to provide nutritional support for an organism.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  asChild
                >
                  <Link href="/menu">
                    Book a Table
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Right Content - Burger Image */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                {/* Main Burger Image */}
                <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                  <Image
                    src="/assets/food/Delicious.jpg"
                    alt="Delicious Burger"
                    fill
                    className="object-cover rounded-full shadow-2xl"
                    priority
                  />
                  {/* Orange accent shape behind burger */}
                  <div className="absolute -bottom-10 -right-10 w-full h-full bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full -z-10 transform rotate-12"></div>
                </div>
                
                {/* Floating Food Icons */}
                <div className="absolute -top-8 -left-8 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <span className="text-2xl">🍤</span>
                </div>
                <div className="absolute top-20 -right-12 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <span className="text-xl">🍕</span>
                </div>
                <div className="absolute -bottom-8 left-8 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-xl">🥤</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-20 fill-white">
            <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* Service Section - Matching Foodie Design */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: "🍕",
                title: "Mexican Pizza",
                description: "Food is any substance consumed to provide nutritional support for an organism."
              },
              {
                icon: "🥤",
                title: "Soft Drinks", 
                description: "Food is any substance consumed to provide nutritional support for an organism."
              },
              {
                icon: "🍟",
                title: "French Fry",
                description: "Food is any substance consumed to provide nutritional support for an organism."
              },
              {
                icon: "🍔",
                title: "Burger King",
                description: "Food is any substance consumed to provide nutritional support for an organism."
              }
            ].map((service, index) => (
              <div key={index} className="text-center group hover:transform hover:-translate-y-2 transition-all duration-300">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center group-hover:shadow-lg transition-shadow">
                  <span className="text-4xl">{service.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed px-4">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section - Matching Foodie Design */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="/assets/Other/About-us.jpg"
                  alt="About AT Restaurant"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-orange-400 rounded-full opacity-20"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-red-400 rounded-full opacity-30"></div>
            </div>
            
            <div>
              <div className="inline-block text-orange-500 text-lg font-medium mb-4">
                About Us
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                We serve the best food in town!
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Food is any substance consumed to provide nutritional support for an organism. 
                At AT RESTAURANT, we believe in serving only the finest quality food made with 
                fresh ingredients and prepared with love.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  "Fresh and organic ingredients",
                  "Skilled and experienced chefs", 
                  "Fast and reliable service",
                  "Affordable prices for everyone"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                size="lg" 
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold"
                asChild
              >
                <Link href="/menu">
                  Explore Menu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Dishes Section - Keeping existing menu functionality */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block text-orange-500 text-lg font-medium mb-4">
              Popular Dishes
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Our Delicious Foods
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Food is any substance consumed to provide nutritional support for an organism.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {popularDishes.length > 0 ? (
              popularDishes.map((dish) => (
                <div key={dish.id} className="group cursor-pointer">
                  <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group-hover:-translate-y-2">
                    <div className="relative h-48 overflow-hidden">
                      {dish.image_url ? (
                        <Image
                          src={dish.image_url}
                          alt={dish.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">No Image</span>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-red-500 text-lg">♡</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{dish.name}</h3>
                      {dish.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{dish.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-orange-500">{formatPrice(dish.price)}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2"
                          onClick={() => handleAddToCart(dish)}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback to hardcoded dishes matching reference design
              [
                { name: "Fried Chicken Unlimited", price: "$12.99", discount: "-15%", originalPrice: "$15.29" },
                { name: "Burger King Whopper", price: "$8.99", discount: "-10%", originalPrice: "$9.99" },
                { name: "White Castle Pizzas", price: "$18.99", discount: "-25%", originalPrice: "$25.32" },
                { name: "Bell Burrito Supreme", price: "$14.99", discount: "-20%", originalPrice: "$18.74" },
                { name: "Kung Pao Chicken BBQ", price: "$16.99", discount: "-5%", originalPrice: "$17.88" },
                { name: "AT Special Burger", price: "$11.99", discount: "-15%", originalPrice: "$14.11" }
              ].map((dish, index) => (
                <div key={index} className="group cursor-pointer">
                  <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group-hover:-translate-y-2">
                    <div className="relative h-48 bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">Food Image</span>
                      <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {dish.discount}
                      </div>
                      <div className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-red-500 text-lg">♡</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">{dish.name}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-orange-500">{dish.price}</span>
                          <span className="text-gray-400 line-through text-sm">{dish.originalPrice}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2"
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Matching Foodie Design */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block text-orange-500 text-lg font-medium mb-4">
              Testimonials
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Our Customers Reviews
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Food is any substance consumed to provide nutritional support for an organism.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "Food Enthusiast",
                review: "I would be lost without restaurant. I would like to personally thank you for your outstanding product."
              },
              {
                name: "Mike Chen",
                role: "Regular Customer",
                review: "I would be lost without restaurant. I would like to personally thank you for your outstanding product."
              },
              {
                name: "Emily Davis",
                role: "Food Blogger",
                review: "I would be lost without restaurant. I would like to personally thank you for your outstanding product."
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Photo</span>
                </div>
                
                <div className="flex justify-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-600 mb-6 italic leading-relaxed">
                  "{testimonial.review}"
                </p>
                
                <div className="font-semibold text-gray-900">{testimonial.name}</div>
                <div className="text-sm text-gray-500">{testimonial.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Matching Foodie Design */}
      <section className="py-20 bg-gradient-to-r from-red-600 to-red-700 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Order?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Experience the best food in town. Order now and get it delivered fresh to your doorstep!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              asChild
            >
              <Link href="/menu">
                Order Now
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-red-600 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300"
              asChild
            >
              <Link href="/location">
                Find Location
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
