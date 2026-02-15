'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, X, User, LogOut, UtensilsCrossed, MapPin, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/contexts/cart-context'
import { PWADiscountBadge } from '@/components/pwa-discount-badge'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export function Header() {
  const { itemCount, total, finalTotal, discountAmount } = useCart()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isAdminPage = pathname.startsWith('/admin')

  useEffect(() => {
    checkAuth()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

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

  if (isAdminPage) {
    return null
  }

  const headerClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled
      ? 'bg-white shadow-clean border-b border-border'
      : 'bg-white/95 backdrop-blur-sm'
  }`

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
            <img 
              src="/assets/icons/android-chrome-192x192.png" 
              alt="AT Restaurant Logo" 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-pink transition-transform group-hover:scale-105"
            />
            <div className="hidden sm:block">
              <span className="text-lg sm:text-xl font-bold text-dark">AT RESTAURANT</span>
              <div className="text-xs -mt-1 text-pink-primary">Fresh Food, Fast Delivery</div>
            </div>
            <span className="sm:hidden text-lg font-bold text-dark">AT</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link href="/menu">
              <Button 
                variant="ghost" 
                className="font-medium px-4 py-2 rounded-lg text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
              >
                Menu
              </Button>
            </Link>
            <Link href="/order-status">
              <Button 
                variant="ghost" 
                className="font-medium px-4 py-2 rounded-lg text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
              >
                Track Order
              </Button>
            </Link>
            <Link href="/location">
              <Button 
                variant="ghost" 
                className="font-medium px-4 py-2 rounded-lg text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
              >
                Locations
              </Button>
            </Link>
          </nav>

          {/* Right Side - Cart and Auth */}
          <div className="flex items-center space-x-3">
            {/* PWA Discount Badge */}
            <PWADiscountBadge variant="header" />
            
            {/* Cart Button */}
            <Link href="/order">
              <Button 
                variant="ghost" 
                className="relative p-2 rounded-lg hover:bg-pink-light border border-border transition-smooth group"
              >
                <ShoppingCart className="h-5 w-5 text-dark group-hover:text-pink-primary transition-colors" />
                {itemCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 bg-pink-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-pink">
                      {itemCount}
                    </span>
                    <span className="hidden md:block ml-2 text-sm font-medium text-dark group-hover:text-pink-primary transition-colors">
                      {discountAmount > 0 ? (
                        <>
                          <span className="line-through text-muted-text mr-1">PKR {total.toFixed(2)}</span>
                          <span className="text-green-600">PKR {finalTotal.toFixed(2)}</span>
                        </>
                      ) : (
                        <>PKR {total.toFixed(2)}</>
                      )}
                    </span>
                  </>
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
                        className="flex items-center space-x-2 rounded-lg px-3 py-2 text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
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
                      className="rounded-lg p-2 text-muted-text hover:text-destructive hover:bg-red-50 transition-smooth"
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
                        className="rounded-lg px-4 py-2 font-medium text-dark hover:text-pink-primary hover:bg-pink-light border border-border transition-smooth"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button 
                        size="sm" 
                        className="btn-pink-primary rounded-lg px-4 py-2"
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
              className="lg:hidden rounded-lg p-2 text-dark hover:text-pink-primary hover:bg-pink-light border border-border transition-smooth"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-border bg-white">
            <nav className="px-4 py-4 space-y-2">
              <Link
                href="/menu"
                className="flex items-center px-4 py-3 rounded-lg font-medium text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
                onClick={() => setIsMenuOpen(false)}
              >
                <UtensilsCrossed className="h-4 w-4 mr-3" />
                Menu
              </Link>
              <Link
                href="/order-status"
                className="flex items-center px-4 py-3 rounded-lg font-medium text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
                onClick={() => setIsMenuOpen(false)}
              >
                <Package className="h-4 w-4 mr-3" />
                Track Order
              </Link>
              <Link
                href="/location"
                className="flex items-center px-4 py-3 rounded-lg font-medium text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
                onClick={() => setIsMenuOpen(false)}
              >
                <MapPin className="h-4 w-4 mr-3" />
                Locations
              </Link>
              
              {/* Mobile Auth */}
              <div className="border-t border-border pt-4 mt-4 space-y-2">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-3 rounded-lg font-medium text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
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
                      className="flex items-center w-full px-4 py-3 rounded-lg font-medium text-dark hover:text-destructive hover:bg-red-50 transition-smooth"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center px-4 py-3 rounded-lg font-medium text-dark hover:text-pink-primary hover:bg-pink-light transition-smooth"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="flex items-center px-4 py-3 text-white btn-pink-primary rounded-lg font-medium"
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
