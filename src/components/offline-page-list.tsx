'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Wifi, WifiOff } from 'lucide-react'

interface CachedPage {
  path: string
  name: string
  description: string
}

const KNOWN_PAGES: CachedPage[] = [
  { path: '/', name: 'Home', description: 'Browse featured items and categories' },
  { path: '/menu', name: 'Menu', description: 'View our complete menu' },
  { path: '/order', name: 'Order', description: 'Complete your order' },
  { path: '/dashboard', name: 'Dashboard', description: 'View your account' },
  { path: '/settings', name: 'Settings', description: 'Manage your preferences' },
  { path: '/location', name: 'Location', description: 'Set delivery location' },
  { path: '/order-status', name: 'Order Status', description: 'Track your orders' },
  { path: '/privacy', name: 'Privacy Policy', description: 'Our privacy policy' },
  { path: '/terms', name: 'Terms', description: 'Terms of service' }
]

export function OfflinePageList() {
  const [isOnline, setIsOnline] = useState(true)
  const [cachedPages, setCachedPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Get cached pages from service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data?.cachedPages) {
          const pages = event.data.cachedPages
            .map((url: string) => new URL(url).pathname)
            .filter((path: string) => KNOWN_PAGES.some(p => p.path === path))
          
          setCachedPages(pages)
          setLoading(false)
        }
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHED_PAGES' },
        [messageChannel.port2]
      )

      // Timeout after 2 seconds
      setTimeout(() => {
        if (loading) {
          setLoading(false)
          // Assume all pages are cached if SW doesn't respond
          setCachedPages(KNOWN_PAGES.map(p => p.path))
        }
      }, 2000)
    } else {
      setLoading(false)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loading])

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <WifiOff className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-dark mb-2">You're Offline</h1>
          <p className="text-muted-text text-lg">
            No internet connection. You can still browse cached pages below.
          </p>
        </div>

        {/* Cached Pages */}
        <div className="bg-white rounded-xl border-2 border-border p-6 mb-6">
          <h2 className="text-xl font-bold text-dark mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            Available Offline Pages
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-primary mx-auto"></div>
              <p className="text-muted-text mt-4">Checking cached pages...</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {KNOWN_PAGES.map((page) => {
                const isCached = cachedPages.includes(page.path)
                
                return (
                  <Link
                    key={page.path}
                    href={page.path}
                    className={`block p-4 rounded-lg border-2 transition-all ${
                      isCached
                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={(e) => {
                      if (!isCached) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-dark mb-1">
                          {page.name}
                        </h3>
                        <p className="text-sm text-muted-text">
                          {page.description}
                        </p>
                      </div>
                      {isCached && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 ml-3" />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Retry Button */}
        <div className="text-center">
          <button
            onClick={() => window.location.reload()}
            className="btn-pink-primary px-8 py-3 rounded-xl font-semibold inline-flex items-center"
          >
            <Wifi className="h-5 w-5 mr-2" />
            Check Connection
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Pages you've visited before are cached and available offline. 
            When you're back online, all features will be restored automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
