'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, X, Smartphone, Percent, Sparkles, Gift } from 'lucide-react'
import { usePWADiscountContext } from '@/contexts/pwa-discount-context'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallDiscountProps {
  /**
   * Delay in milliseconds before showing the prompt
   * Default: 30000 (30 seconds)
   */
  delayMs?: number
  /**
   * Minimum number of page views before showing prompt
   * Default: 2
   */
  minPageViews?: number
}

export function PWAInstallDiscount({ 
  delayMs = 30000, 
  minPageViews = 2 
}: PWAInstallDiscountProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [pageViews, setPageViews] = useState(0)
  
  const { isEligible, activateDiscount } = usePWADiscountContext()

  useEffect(() => {
    // Track page views
    const currentViews = parseInt(sessionStorage.getItem('pwa-page-views') || '0', 10)
    const newViews = currentViews + 1
    sessionStorage.setItem('pwa-page-views', newViews.toString())
    setPageViews(newViews)

    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      
      // If installed but discount not activated, activate it
      if (!isEligible) {
        activateDiscount().then(success => {
          if (success) {
            setShowSuccessMessage(true)
            setTimeout(() => setShowSuccessMessage(false), 5000)
          }
        })
      }
      return
    }

    // Check if user has already dismissed the prompt
    const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-dismissed')
    if (hasSeenPrompt) {
      return
    }

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    
    if (isIOS && !isInStandaloneMode) {
      // Show iOS install instructions after delay and page views
      setTimeout(() => {
        if (newViews >= minPageViews) {
          setShowInstallPrompt(true)
        }
      }, delayMs)
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show install prompt after delay and minimum page views
      setTimeout(() => {
        if (newViews >= minPageViews) {
          setShowInstallPrompt(true)
        }
      }, delayMs)
    }

    // Listen for app installed event
    const handleAppInstalled = async () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      
      // Activate discount
      const success = await activateDiscount()
      if (success) {
        setShowSuccessMessage(true)
        setTimeout(() => setShowSuccessMessage(false), 8000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [delayMs, minPageViews, isEligible, activateDiscount])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        // Installation accepted - discount will be activated via appinstalled event
        setShowInstallPrompt(false)
      } else {
        // User dismissed the install prompt
        setShowInstallPrompt(false)
        localStorage.setItem('pwa-install-prompt-dismissed', 'true')
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Error during installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-prompt-dismissed', 'true')
  }

  // Success message after installation
  if (showSuccessMessage) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5">
        <Card className="shadow-lg border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-green-900 text-lg mb-1 flex items-center">
                  <Gift className="h-5 w-5 mr-2" />
                  Welcome! 🎉
                </h3>
                <p className="text-sm text-green-800 font-medium mb-2">
                  Your 10% discount has been activated!
                </p>
                <p className="text-xs text-green-700">
                  You'll see discounted prices throughout the app. Happy ordering!
                </p>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSuccessMessage(false)}
                className="p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isInstalled || !showInstallPrompt) {
    return null
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5">
      <Card className="shadow-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <CardContent className="p-4">
          {/* Discount Badge */}
          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1 animate-pulse">
            <Percent className="h-3 w-3" />
            <span>10% OFF</span>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <Smartphone className="h-7 w-7 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base mb-1">
                Install our app and get 10% off!
              </h3>
              
              <p className="text-sm text-gray-700 mb-3 font-medium">
                Install AT RESTAURANT and save on your entire purchase
              </p>
              
              <div className="space-y-2 text-xs text-gray-600 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Percent className="h-3 w-3 text-orange-600" />
                  </div>
                  <span className="font-medium">10% discount on all orders</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Download className="h-3 w-3 text-blue-600" />
                  </div>
                  <span>Faster loading & offline access</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-3 w-3 text-purple-600" />
                  </div>
                  <span>Native app experience</span>
                </div>
              </div>
              
              {isIOS ? (
                <>
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-xs mb-3">
                    <p className="font-bold text-blue-900 mb-1 flex items-center">
                      <Sparkles className="h-3 w-3 mr-1" />
                      To install on iOS:
                    </p>
                    <p className="text-blue-800">
                      1. Tap the Share button <span className="font-mono text-base">⬆️</span> in Safari<br />
                      2. Select "Add to Home Screen"<br />
                      3. Your 10% discount activates instantly!
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      className="text-xs"
                    >
                      Maybe later
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-xs font-bold shadow-md flex-1"
                    disabled={!deferredPrompt}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Install & Save 10%
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-xs"
                  >
                    Not now
                  </Button>
                </div>
              )}
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="p-1 h-auto"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
