'use client'

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

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

  // Only show when offline
  if (isOnline) return null

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
      <WifiOff className="h-4 w-4" />
      <span>Connection unavailable</span>
    </div>
  )
}