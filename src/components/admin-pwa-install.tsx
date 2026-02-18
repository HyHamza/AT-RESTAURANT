'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, X, Shield, Zap, Bell } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __ADMIN_SW_REGISTERED__?: boolean
    __ADMIN_SW_REGISTERING__?: boolean
  }
}

// Clean up old admin service workers
async function cleanupOldAdminServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
      
      if (scriptURL && scriptURL.includes('/admin/sw.js')) {
        // Check if it's an old version
        const cacheNames = await caches.keys();
        const hasOldCache = cacheNames.some(name => 
          name.includes('admin-v1') || name.includes('admin-v2') || name.includes('admin-v3')
        );
        
        if (hasOldCache) {
          console.log('[Admin SW Cleanup] Unregistering old admin SW');
          await registration.unregister();
          
          // Delete old caches
          for (const cacheName of cacheNames) {
            if (cacheName.includes('admin-v1') || cacheName.includes('admin-v2') || cacheName.includes('admin-v3')) {
              console.log('[Admin SW Cleanup] Deleting old cache:', cacheName);
              await caches.delete(cacheName);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('[Admin SW Cleanup] Error during cleanup:', error);
  }
}

async function registerAdminServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // CRITICAL: ONLY register admin SW on admin routes
  if (!window.location.pathname.startsWith('/admin')) {
    console.log('[Admin SW] Skipping registration - not on admin route');
    return null;
  }

  if (window.__ADMIN_SW_REGISTERED__ || window.__ADMIN_SW_REGISTERING__) {
    console.log('[Admin SW] Already registered or registering');
    return navigator.serviceWorker.ready.catch(() => null);
  }

  window.__ADMIN_SW_REGISTERING__ = true;

  try {
    // Clean up old admin service workers first
    await cleanupOldAdminServiceWorkers();

    // Check if already controlled by correct SW
    if (navigator.serviceWorker.controller) {
      const controllerUrl = navigator.serviceWorker.controller.scriptURL;
      console.log('[Admin SW] Already controlled by:', controllerUrl);
      
      if (controllerUrl.includes('/admin/sw.js')) {
        window.__ADMIN_SW_REGISTERED__ = true;
        window.__ADMIN_SW_REGISTERING__ = false;
        return navigator.serviceWorker.ready;
      }
    }

    console.log('[Admin SW] Registering v4 with scope /admin/...');
    const registration = await navigator.serviceWorker.register('/admin/sw.js', {
      scope: '/admin/',
      updateViaCache: 'none'
    });

    console.log('[Admin SW] Registration successful, scope:', registration.scope);
    
    window.__ADMIN_SW_REGISTERED__ = true;
    window.__ADMIN_SW_REGISTERING__ = false;

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('[Admin SW] Update found');
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[Admin SW] New version available, activating...');
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Handle controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Admin SW] Controller changed, reloading page...');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.warn('[Admin SW] Registration failed:', error);
    window.__ADMIN_SW_REGISTERING__ = false;
    return null;
  }
}

export function AdminPWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // CRITICAL: Check if app is already running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      console.log('[Admin PWA] Already running in standalone mode - suppressing install prompt');
      return;
    }

    // Check if admin app is already installed via localStorage
    const adminInstalled = localStorage.getItem('admin-pwa-installed') === 'true';
    if (adminInstalled) {
      setIsInstalled(true);
      return;
    }

    // Register admin service worker immediately
    registerAdminServiceWorker().catch(err => {
      console.warn('[Admin PWA] SW registration error:', err);
    });

    // Check if running in iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    
    if (isIOS && !isInStandaloneMode) {
      setTimeout(() => {
        const hasSeenIOSPrompt = localStorage.getItem('admin-pwa-ios-install-prompt-seen')
        if (!hasSeenIOSPrompt) {
          setShowInstallPrompt(true)
        }
      }, 3000)
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      
      // CRITICAL: Double-check standalone mode even if event fires
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      
      if (isStandalone) {
        console.log('[Admin PWA] Standalone mode detected - ignoring beforeinstallprompt');
        return;
      }
      
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Check if user has dismissed before
      const hasSeenPrompt = localStorage.getItem('admin-pwa-install-prompt-dismissed');
      if (hasSeenPrompt) {
        console.log('[Admin PWA] User previously dismissed - not showing prompt');
        return;
      }
      
      setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('admin-pwa-install-prompt-seen')
        if (!hasSeenPrompt) {
          setShowInstallPrompt(true)
        }
      }, 2000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      localStorage.setItem('admin-pwa-installed', 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('[Admin PWA] User accepted the install prompt')
        localStorage.setItem('admin-pwa-installed', 'true')
      } else {
        console.log('[Admin PWA] User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      localStorage.setItem('admin-pwa-install-prompt-seen', 'true')
    } catch (error) {
      console.error('[Admin PWA] Error during installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    localStorage.setItem(
      isIOS ? 'admin-pwa-ios-install-prompt-seen' : 'admin-pwa-install-prompt-seen', 
      'true'
    )
    // Mark as dismissed so we don't show again
    localStorage.setItem('admin-pwa-install-prompt-dismissed', 'true')
  }

  if (isInstalled || !showInstallPrompt) {
    return null
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="shadow-xl border-orange-300 bg-gradient-to-br from-orange-50 to-white">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base mb-1">
                Install Admin App
              </h3>
              
              <div className="space-y-2 text-xs text-gray-600 mb-3">
                <div className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-orange-500" />
                  <span>Quick access to admin dashboard</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Bell className="h-3 w-3 text-blue-500" />
                  <span>Real-time order notifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-3 w-3 text-green-500" />
                  <span>Separate app for admin tasks</span>
                </div>
              </div>
              
              {isIOS ? (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                  <p className="font-semibold text-blue-900 mb-1">To install on iOS:</p>
                  <ol className="text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Tap the Share button <span className="font-mono text-base">⬆️</span> in Safari</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" to install the Admin App</li>
                  </ol>
                </div>
              ) : (
                <div className="flex space-x-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs shadow-md"
                    disabled={!deferredPrompt}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Install Admin App
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
              
              {isIOS && (
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-xs"
                  >
                    Got it
                  </Button>
                </div>
              )}
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
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
