'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LogOut, Menu as MenuIcon, Package, Users, BarChart3, X, Home, ChevronRight, UtensilsCrossed, ShoppingBag, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AdminPWAInstall } from '@/components/admin-pwa-install'
import { AdminNotifications } from '@/components/admin-notifications'
import Head from 'next/head'

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

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Check if user is admin using the is_admin column
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
          // User exists but is not admin
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
        // Check if user is admin using the is_admin column
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
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="mt-4 text-gray-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Admin Email"
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              {loginError && (
                <p className="text-red-600 text-sm">{loginError}</p>
              )}
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Menu', href: '/admin/menu', icon: Package },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Customers', href: '/admin/customers', icon: UserCircle },
  ]

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs = []
    
    if (paths.length > 1) {
      const pageName = paths[paths.length - 1]
      const pageTitle = pageName.charAt(0).toUpperCase() + pageName.slice(1)
      breadcrumbs.push({ name: pageTitle, href: pathname })
    }
    
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin-specific manifest and meta tags */}
      <Head>
        <link rel="manifest" href="/admin-manifest.json" />
        <meta name="theme-color" content="#ea580c" />
        <meta name="apple-mobile-web-app-title" content="AT Admin" />
      </Head>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-orange-500 to-red-500 shadow-sm">
          <div className="flex items-center space-x-3">
            <img 
              src="/assets/icons/android-chrome-192x192.png" 
              alt="AT Restaurant Logo" 
              className="w-8 h-8 rounded-lg"
            />
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          </div>
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-white/20"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="mt-6 flex-1">
          <div className="px-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-500' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-orange-600'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-orange-500' : ''}`} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="p-4 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center space-x-3 px-4 py-2 mb-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>Back to Website</span>
          </Link>
          
          <div className="flex items-center justify-between text-sm px-4 py-2 bg-gray-50 rounded-lg mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-semibold text-xs">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900 truncate max-w-32 text-xs">
                  {user?.email}
                </div>
                <div className="text-xs text-gray-500">Administrator</div>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar for mobile only */}
        <div className="bg-white shadow-sm border-b lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:bg-gray-100"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <img 
                src="/assets/icons/android-chrome-192x192.png" 
                alt="AT Restaurant Logo" 
                className="w-6 h-6 rounded"
              />
              <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-600 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:block bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">AT Restaurant Admin</h1>
              </div>
              {breadcrumbs.length > 0 && (
                <>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <nav className="flex items-center space-x-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={crumb.href} className="font-medium text-gray-700">
                        {crumb.name}
                      </span>
                    ))}
                  </nav>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 hover:border-red-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Admin PWA Install Prompt */}
      <AdminPWAInstall />

      {/* Admin Notifications */}
      <AdminNotifications />
    </div>
  )
}