'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/admin-context'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderNotification {
  id: string
  customer_name: string
  total_amount: number
  created_at: string
}

interface NotificationToast {
  id: string
  message: string
  timestamp: number
}

export function AdminNotifications() {
  const { isAdmin, isLoading } = useAdmin()
  const [notifications, setNotifications] = useState<NotificationToast[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')

  useEffect(() => {
    // Only set up notifications for admin users
    if (isLoading || !isAdmin) {
      return
    }

    // Subscribe to new orders
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as OrderNotification
          handleNewOrderNotification(newOrder)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected')
          console.error('Failed to subscribe to order notifications')
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, isLoading])

  const handleNewOrderNotification = (order: OrderNotification) => {
    const message = `New order from ${order.customer_name} - $${order.total_amount.toFixed(2)}`
    
    const notification: NotificationToast = {
      id: order.id,
      message,
      timestamp: Date.now()
    }

    // Add notification to state
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep max 5 notifications

    // Play notification sound if enabled
    if (soundEnabled) {
      playNotificationSound()
    }

    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      removeNotification(notification.id)
    }, 10000)
  }

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      // Sound failed, continue silently
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const toggleSound = () => {
    setSoundEnabled(prev => !prev)
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  // Don't render anything if not admin
  if (!isAdmin) {
    return null
  }

  return (
    <>
      {/* Sound toggle and notification counter - fixed position */}
      <div className="fixed top-4 right-4 z-40 flex items-center space-x-2">
        {notifications.length > 0 && (
          <Button
            onClick={clearAllNotifications}
            variant="outline"
            size="sm"
            className="bg-white shadow-md text-xs"
          >
            Clear All
          </Button>
        )}
        <Button
          onClick={toggleSound}
          variant="outline"
          size="sm"
          className="bg-white shadow-md relative"
          title={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
        >
          <Bell className={`h-4 w-4 ${soundEnabled ? 'text-orange-500' : 'text-gray-400'}`} />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </Button>
        
        {/* Connection status indicator */}
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' : 
          connectionStatus === 'connecting' ? 'bg-yellow-500' : 
          'bg-red-500'
        }`} title={`Real-time connection: ${connectionStatus}`} />
      </div>

      {/* Notification toasts */}
      <div className="fixed top-16 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white border border-orange-200 rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-out"
            style={{
              animation: 'slideInFromRight 0.3s ease-out'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Bell className="h-4 w-4 text-orange-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    New Order Received
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => removeNotification(notification.id)}
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}