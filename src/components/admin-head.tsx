'use client'

import { useEffect } from 'react'

export function AdminHead() {
  useEffect(() => {
    // Update manifest link
    const manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) {
      manifestLink.setAttribute('href', '/admin-manifest.json')
    } else {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = '/admin-manifest.json'
      document.head.appendChild(link)
    }

    // Update theme color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#1F2937')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = '#1F2937'
      document.head.appendChild(meta)
    }

    // Update apple touch icons to admin icons
    const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]')
    appleTouchIcons.forEach(icon => {
      const href = icon.getAttribute('href')
      if (href && !href.includes('admin-icons')) {
        const newHref = href.replace('/assets/icons/', '/assets/admin-icons/admin-')
        icon.setAttribute('href', newHref)
      }
    })

    // Update app title
    const appNameMeta = document.querySelector('meta[name="application-name"]')
    if (appNameMeta) {
      appNameMeta.setAttribute('content', 'Admin Panel')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'application-name'
      meta.content = 'Admin Panel'
      document.head.appendChild(meta)
    }

    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', 'Admin')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'apple-mobile-web-app-title'
      meta.content = 'Admin'
      document.head.appendChild(meta)
    }

    // Update status bar style for admin
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', 'black-translucent')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'apple-mobile-web-app-status-bar-style'
      meta.content = 'black-translucent'
      document.head.appendChild(meta)
    }

    // Cleanup function to restore user app settings when leaving admin
    return () => {
      const manifestLink = document.querySelector('link[rel="manifest"]')
      if (manifestLink) {
        manifestLink.setAttribute('href', '/manifest.json')
      }

      const themeColorMeta = document.querySelector('meta[name="theme-color"]')
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#e11b70')
      }
    }
  }, [])

  return null
}
