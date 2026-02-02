'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, X, User, LogOut, UtensilsCrossed, MapPin, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/contexts/cart-context'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export function Header() {
  const { itemCount, total } = useCart()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check if we're on the homepage or admin pages
  const isHomepage = pathname === '/'
  const isAdminPage = pathname.startsWith('/admin')

  useEffect(() => {
    checkAuth()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const newIsScrolled = scrollTop > 20
      setIsScrolled(newIsScrolled)
    }

    // Set initial state
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Don't render header on admin pages since they have their own layout
  if (isAdminPage) {
    return null
  }

  // Modern header styling - fully transparent on homepage hero, solid elsewhere
  const headerClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled || !isHomepage
      ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
      : 'bg-transparent header-transparent'
  }`

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Modern Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className={`text-xl font-bold transition-colors duration-300 ${
                isHomepage && !isScrolled ? 'text-white' : 'text-gray-900'
              }`}>AT Restaurant</span>
              <div className={`text-xs -mt-1 transition-colors duration-300 ${
                isHomepage && !isScrolled ? 'text-white/80' : 'text-gray-500'
              }`}>Fresh • Fast • Delicious</div>
            </div>
          </Link>

          {/* Desktop Navigation - Simplified and focused */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link href="/menu">
              <Button 
                variant="ghost" 
                className={`font-medium px-4 py-2 rounded-lg transition-all ${
                  isHomepage && !isScrolled 
                    ? 'text-white hover:text-orange-200 hover:bg-white/20' 
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                Menu
              </Button>
            </Link>
            <Link href="/order-status">
              <Button 
                variant="ghost" 
                className={`font-medium px-4 py-2 rounded-lg transition-all ${
                  isHomepage && !isScrolled 
                    ? 'text-white hover:text-orange-200 hover:bg-white/20' 
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                Track Order
              </Button>
            </Link>
            <Link href="/location">
              <Button 
                variant="ghost" 
                className={`font-medium px-4 py-2 rounded-lg transition-all ${
                  isHomepage && !isScrolled 
                    ? 'text-white hover:text-orange-200 hover:bg-white/20' 
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                Locations
              </Button>
            </Link>
          </nav>

          {/* Right Side - Cart and Auth */}
          <div className="flex items-center space-x-3">
            {/* Enhanced Cart Button */}
            <Link href="/order">
              <Button 
                variant="ghost" 
                className={`relative p-2 rounded-lg transition-all group ${
                  isHomepage && !isScrolled 
                    ? 'hover:bg-white/20 border border-white/30' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <ShoppingCart className={`h-5 w-5 transition-colors ${
                  isHomepage && !isScrolled 
                    ? 'text-white group-hover:text-orange-200' 
                    : 'text-gray-700 group-hover:text-orange-600'
                }`} />
                {itemCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-sm">
                      {itemCount}
                    </span>
                    <span className={`hidden md:block ml-2 text-sm font-medium transition-colors ${
                      isHomepage && !isScrolled 
                        ? 'text-white group-hover:text-orange-200' 
                        : 'text-gray-700 group-hover:text-orange-600'
                    }`}>
                      ${total.toFixed(2)}
                    </span>
                  </>
                )}
              </Button>
            </Link>

            {/* Authentication - Cleaner design */}
            {!loading && (
              <>
                {user ? (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/dashboard">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`flex items-center space-x-2 rounded-lg px-3 py-2 transition-all ${
                          isHomepage && !isScrolled 
                            ? 'text-white hover:text-orange-200 hover:bg-white/10' 
                            : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span className="max-w-20 truncate text-sm">
                          {user.user_metadata?.full_name?.split(' ')[0] || 'Account'}
                        </span>
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleLogout}
                      className={`rounded-lg p-2 transition-all ${
                        isHomepage && !isScrolled 
                          ? 'text-white/80 hover:text-red-300 hover:bg-white/10' 
                          : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/login">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={`rounded-lg px-4 py-2 transition-all font-medium ${
                          isHomepage && !isScrolled 
                            ? 'text-white hover:text-orange-200 hover:bg-white/20 border border-white/30' 
                            : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                        }`}
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all"
                      >
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className={`lg:hidden rounded-lg p-2 transition-all ${
                isHomepage && !isScrolled 
                  ? 'text-white hover:text-orange-200 hover:bg-white/20 border border-white/30' 
                  : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation - Modern slide-down design */}
        {isMenuOpen && (
          <div className={`lg:hidden border-t transition-all duration-300 ${
            isHomepage && !isScrolled 
              ? 'border-white/20 bg-black/80 backdrop-blur-md' 
              : 'border-gray-100 bg-white/95 backdrop-blur-md'
          }`}>
            <nav className="px-4 py-4 space-y-2">
              <Link
                href="/menu"
                className={`flex items-center px-4 py-3 rounded-lg transition-all font-medium ${
                  isHomepage && !isScrolled 
                    ? 'text-white hover:text-orange-200 hover:bg-white/20' 
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <UtensilsCrossed className="h-4 w-4 mr-3" />
                Menu
              </Link>
              <Link
                href="/order-status"
                className={`flex items-center px-4 py-3 rounded-lg transition-all font-medium ${
                  isHomepage && !isScrolled 
                    ? 'text-white hover:text-orange-200 hover:bg-white/20' 
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Package className="h-4 w-4 mr-3" />
                Track Order
              </Link>
              <Link
                href="/location"
                className={`flex items-center px-4 py-3 rounded-lg transition-all font-medium ${
                  isHomepage && !isScrolled 
                    ? 'text-white hover:text-orange-200 hover:bg-white/20' 
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <MapPin className="h-4 w-4 mr-3" />
                Locations
              </Link>
              
              {/* Mobile Auth */}
              <div className={`border-t pt-4 mt-4 space-y-2 ${
                isHomepage && !isScrolled ? 'border-white/30' : 'border-gray-100'
              }`}>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className={`flex items-center px-4 py-3 rounded-lg transition-all font-medium ${
                        isHomepage && !isScrolled 
                          ? 'text-white hover:text-orange-200 hover:bg-white/20' 
                          : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className={`flex items-center w-full px-4 py-3 rounded-lg transition-all font-medium ${
                        isHomepage && !isScrolled 
                          ? 'text-white hover:text-red-300 hover:bg-white/20' 
                          : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={`flex items-center px-4 py-3 rounded-lg transition-all font-medium ${
                        isHomepage && !isScrolled 
                          ? 'text-white hover:text-orange-200 hover:bg-white/20' 
                          : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="flex items-center px-4 py-3 text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg transition-all font-medium shadow-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}