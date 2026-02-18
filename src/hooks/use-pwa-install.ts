'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  canInstall: boolean
  install: () => Promise<void>
  dismiss: () => void
}

export function usePWAInstall(scope: 'user' | 'admin' = 'user'): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    // Check if app is already installed
    if (standalone) {
      const currentUrl = window.location.href
      const isAdminUrl = currentUrl.includes('/admin')
      
      if ((scope === 'admin' && isAdminUrl) || (scope === 'user' && !isAdminUrl)) {
        setIsInstalled(true)
        return
      }
    }

    // Check localStorage for installation status
    const storageKey = scope === 'admin' ? 'admin-pwa-installed' : 'pwa-installed'
    const installed = localStorage.getItem(storageKey) === 'true'
    if (installed) {
      setIsInstalled(true)
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      const storageKey = scope === 'admin' ? 'admin-pwa-installed' : 'pwa-installed'
      localStorage.setItem(storageKey, 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [scope])

  const install = async () => {
    if (!deferredPrompt) {
      throw new Error('Install prompt not available')
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        const storageKey = scope === 'admin' ? 'admin-pwa-installed' : 'pwa-installed'
        localStorage.setItem(storageKey, 'true')
        setIsInstalled(true)
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Error during PWA installation:', error)
      throw error
    }
  }

  const dismiss = () => {
    const storageKey = scope === 'admin' 
      ? 'admin-pwa-install-prompt-seen' 
      : 'pwa-install-prompt-seen'
    localStorage.setItem(storageKey, 'true')
    setDeferredPrompt(null)
  }

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isStandalone,
    canInstall: !!deferredPrompt && !isInstalled,
    install,
    dismiss
  }
}
