'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  LogOut, 
  Menu as MenuIcon, 
  Package, 
  Users, 
  BarChart3, 
  X, 
  Home, 
  ShoppingBag, 
  UserCircle,
  Bell,
  Settings,
  Search,
  ChevronLeft
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AdminPWAInstall } from '@/components/admin-pwa-install'
import { AdminNotifications } from '@/components/admin-notifications'
import { AdminHead } from '@/components/admin-head'
import { useIsMobile, useIsDesktop } from '@/hooks/use-media-query'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const isDesktop = useIsDesktop()

  useEffect(() => {
    checkAuth()
    
    // Client-side auth check on mount - three-layer defense
    const verifyAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.log('[Admin Layout] No session found on mount, staying on login page')
        }
      } catch (error) {
        console.error('[Admin Layout] Auth verification error:', error)
      }
    }
    
    verifyAuth()
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [pathname, isMobile])

  // Auto-close sidebar on mobile when clicking outside
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById('admin-sidebar')
      const menuButton = document.getElementById('menu-button')
      
      if (sidebar && !sidebar.contains(e.target as Node) && 
          menuButton && !menuButton.contains(e.target as Node)) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobile, sidebarOpen])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error checking admin status:', error)
          setLoginError('Error checking admin privileges.')
          return
        }

        if (userData?.is_admin) {
          setUser(session.user)
          setIsAuthenticated(true)
        } else {
          await supabase.auth.signOut()
          setLoginError('Access denied. Admin privileges required.')
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) throw error

      if (data.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', data.user.id)
          .single()

        if (error) {
          console.error('Error checking admin status:', error)
          setLoginError('Error checking admin privileges.')
          return
        }

        if (userData?.is_admin) {
          setUser(data.user)
          setIsAuthenticated(true)
          
          // CRITICAL: Clear service worker cache after successful login
          // This ensures next navigation fetches fresh authenticated content
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('[Admin Layout] Clearing admin cache after login')
            navigator.serviceWorker.controller.postMessage({ 
              type: 'CLEAR_ADMIN_CACHE' 
            })
          }
        } else {
          await supabase.auth.signOut()
          setLoginError('Access denied. Admin privileges required.')
        }
      }
    } catch (error: any) {
      setLoginError(error.message || 'Login failed')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
    
    // Clear service worker cache on logout
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[Admin Layout] Clearing admin cache after logout')
      navigator.serviceWorker.controller.postMessage({ 
        type: 'CLEAR_ADMIN_CACHE' 
      })
    }
    
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="mt-4 text-gray-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <img 
                  src="/assets/icons/android-chrome-192x192.png" 
                  alt="AT Restaurant" 
                  className="w-12 h-12 rounded-xl"
                />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-gray-900">Admin Login</CardTitle>
            <p className="text-center text-sm text-gray-600">Sign in to access the admin panel</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Email Address</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  className="h-11"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="h-11"
                  required
                />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm font-medium">{loginError}</p>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg"
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart3, badge: null },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag, badge: null },
    { name: 'Menu', href: '/admin/menu', icon: Package, badge: null },
    { name: 'Users', href: '/admin/users', icon: Users, badge: null },
    { name: 'Customers', href: '/admin/customers', icon: UserCircle, badge: null },
  ]

  const getPageTitle = () => {
    const paths = pathname.split('/').filter(Boolean)
    if (paths.length === 1) return 'Dashboard'
    const pageName = paths[paths.length - 1]
    return pageName.charAt(0).toUpperCase() + pageName.slice(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin PWA Head Configuration */}
      <AdminHead />
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen || isDesktop ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-red-500">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <img 
                src="/assets/icons/android-chrome-192x192.png" 
                alt="AT Restaurant" 
                className="w-8 h-8 rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AT Restaurant</h1>
              <p className="text-xs text-orange-100">Admin Panel</p>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto h-[calc(100vh-16rem)]">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <div className="flex items-center">
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-orange-500'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-600 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link
            href="/"
            className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-all duration-200 group"
            onClick={() => isMobile && setSidebarOpen(false)}
          >
            <Home className="h-5 w-5 text-gray-500 group-hover:text-orange-500" />
            <span>Back to Website</span>
          </Link>
          
          <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-600">Administrator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-100 font-medium"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`${isDesktop ? 'lg:pl-72' : ''}`}>
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              {!isDesktop && (
                <Button
                  id="menu-button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="text-gray-600 hover:bg-gray-100"
                  aria-label="Open sidebar"
                >
                  <MenuIcon className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  {pathname === '/admin' ? 'Overview of your restaurant' : `Manage your ${getPageTitle().toLowerCase()}`}
                </p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-600 hover:bg-gray-100 hidden sm:flex"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-gray-600 hover:bg-gray-100"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Admin PWA Install Prompt */}
      <AdminPWAInstall />

      {/* Admin Notifications */}
      <AdminNotifications />
    </div>
  )
}