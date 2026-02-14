'use client'

import { useEffect } from 'react'

export function UserServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          // Check if user SW is already registered
          const registrations = await navigator.serviceWorker.getRegistrations()
          const userSwRegistration = registrations.find(reg => 
            reg.active?.scriptURL.includes('sw.js') && !reg.active?.scriptURL.includes('admin-sw.js')
          )

          if (!userSwRegistration) {
            console.log('[User PWA] Registering user service worker...')
            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
            })
            console.log('[User PWA] User service worker registered:', registration.scope)

            // Listen for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[User PWA] New user service worker available')
                    // Optionally notify user about update
                  }
                })
              }
            })
          } else {
            console.log('[User PWA] User service worker already registered')
          }
        } catch (error) {
          console.error('[User PWA] Service worker registration failed:', error)
        }
      })
    }
  }, [])

  return null
}
