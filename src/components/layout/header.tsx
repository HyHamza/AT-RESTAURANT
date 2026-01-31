'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, X, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/contexts/cart-context'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export function Header() {
  const { itemCount } = useCart()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check if we're on the homepage
  const isHomepage = pathname === '/'

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
    // Only add scroll listener on homepage
    if (!isHomepage) {
      setIsScrolled(true) // Always show white header on other pages
      return
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY
      setIsScrolled(scrollTop > 50)
    }

    // Set initial state
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHomepage])

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

  // Dynamic classes based on scroll state and page
  const headerClasses = isHomepage
    ? `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg backdrop-blur-sm'
          : 'bg-transparent'
      }`
    : 'bg-white shadow-sm border-b sticky top-0 z-50'

  const logoTextClasses = isHomepage
    ? `transition-colors duration-300 ${
        isScrolled ? 'text-gray-900' : 'text-white'
      }`
    : 'text-gray-900'

  const navLinkClasses = isHomepage
    ? `transition-colors duration-300 ${
        isScrolled 
          ? 'text-gray-700 hover:text-orange-500' 
          : 'text-white hover:text-orange-300'
      }`
    : 'text-gray-700 hover:text-orange-500'

  const mobileMenuClasses = isHomepage && !isScrolled
    ? 'bg-red-700 bg-opacity-95 backdrop-blur-sm'
    : 'bg-white'

  const mobileLinkClasses = isHomepage && !isScrolled
    ? 'text-white hover:text-orange-300'
    : 'text-gray-700 hover:text-orange-500'

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">AT</span>
            </div>
            <span className={`text-xl font-bold ${logoTextClasses}`}>AT RESTAURANT</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className={`${navLinkClasses} transition-colors`}>
              Home
            </Link>
            <Link href="/menu" className={`${navLinkClasses} transition-colors`}>
              Menu
            </Link>
            <Link href="/location" className={`${navLinkClasses} transition-colors`}>
              Location
            </Link>
            <Link href="/order-status" className={`${navLinkClasses} transition-colors`}>
              Order Status
            </Link>
          </nav>

          {/* Right Side - Cart, Auth, Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link href="/order">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`relative transition-colors duration-300 ${
                  isHomepage && !isScrolled 
                    ? 'text-white hover:text-orange-300 hover:bg-white/10' 
                    : 'text-gray-700 hover:text-orange-500 hover:bg-gray-100'
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Authentication */}
            {!loading && (
              <>
                {user ? (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/dashboard">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`flex items-center space-x-2 transition-colors duration-300 ${
                          isHomepage && !isScrolled 
                            ? 'text-white hover:text-orange-300 hover:bg-white/10' 
                            : 'text-gray-700 hover:text-orange-500 hover:bg-gray-100'
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span className="max-w-24 truncate">
                          {user.user_metadata?.full_name || user.email}
                        </span>
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleLogout}
                      className={`transition-colors duration-300 ${
                        isHomepage && !isScrolled 
                          ? 'text-white hover:text-orange-300 hover:bg-white/10' 
                          : 'text-gray-700 hover:text-orange-500 hover:bg-gray-100'
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
                        className={`transition-colors duration-300 ${
                          isHomepage && !isScrolled 
                            ? 'text-white hover:text-orange-300 hover:bg-white/10' 
                            : 'text-gray-700 hover:text-orange-500 hover:bg-gray-100'
                        }`}
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
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
              className={`md:hidden transition-colors duration-300 ${
                isHomepage && !isScrolled 
                  ? 'text-white hover:text-orange-300 hover:bg-white/10' 
                  : 'text-gray-700 hover:text-orange-500 hover:bg-gray-100'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className={`md:hidden border-t transition-colors duration-300 ${mobileMenuClasses}`}>
            <nav className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/"
                className={`block px-3 py-2 transition-colors ${mobileLinkClasses}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/menu"
                className={`block px-3 py-2 transition-colors ${mobileLinkClasses}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Menu
              </Link>
              <Link
                href="/location"
                className={`block px-3 py-2 transition-colors ${mobileLinkClasses}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Location
              </Link>
              <Link
                href="/order-status"
                className={`block px-3 py-2 transition-colors ${mobileLinkClasses}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Order Status
              </Link>
              
              {/* Mobile Auth */}
              <div className={`border-t pt-2 mt-2 ${isHomepage && !isScrolled ? 'border-white/20' : 'border-gray-200'}`}>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className={`block px-3 py-2 transition-colors ${mobileLinkClasses}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4 inline mr-2" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className={`block w-full text-left px-3 py-2 transition-colors ${mobileLinkClasses}`}
                    >
                      <LogOut className="h-4 w-4 inline mr-2" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={`block px-3 py-2 transition-colors ${mobileLinkClasses}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className={`block px-3 py-2 font-medium transition-colors ${
                        isHomepage && !isScrolled ? 'text-orange-300' : 'text-orange-500'
                      }`}
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