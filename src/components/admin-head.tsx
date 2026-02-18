'use client'

import { useEffect } from 'react'

export function AdminHead() {
  useEffect(() => {
    console.log('[AdminHead] Configuring admin PWA metadata...');

    // CRITICAL: Replace manifest link with admin manifest
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestLink) {
      manifestLink.setAttribute('href', '/admin/manifest.json');
      console.log('[AdminHead] Updated existing manifest link to /admin/manifest.json');
    } else {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/admin/manifest.json';
      document.head.appendChild(manifestLink);
      console.log('[AdminHead] Created new manifest link for /admin/manifest.json');
    }

    // Update theme color to admin theme
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#ea580c');
    } else {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      themeColorMeta.content = '#ea580c';
      document.head.appendChild(themeColorMeta);
    }

    // Update apple touch icons to admin icons
    const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
    appleTouchIcons.forEach(icon => {
      const href = icon.getAttribute('href');
      if (href && !href.includes('admin-icons')) {
        icon.setAttribute('href', '/assets/admin-icons/admin-icon-180.png');
      }
    });

    // Update app title metadata
    let appNameMeta = document.querySelector('meta[name="application-name"]') as HTMLMetaElement;
    if (appNameMeta) {
      appNameMeta.setAttribute('content', 'AT Restaurant Admin');
    } else {
      appNameMeta = document.createElement('meta');
      appNameMeta.name = 'application-name';
      appNameMeta.content = 'AT Restaurant Admin';
      document.head.appendChild(appNameMeta);
    }

    let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', 'Admin Panel');
    } else {
      appleTitleMeta = document.createElement('meta');
      appleTitleMeta.name = 'apple-mobile-web-app-title';
      appleTitleMeta.content = 'Admin Panel';
      document.head.appendChild(appleTitleMeta);
    }

    // Update status bar style for admin
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', 'black-translucent');
    } else {
      statusBarMeta = document.createElement('meta');
      statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
      statusBarMeta.content = 'black-translucent';
      document.head.appendChild(statusBarMeta);
    }

    console.log('[AdminHead] Admin PWA metadata configured successfully');

    // Cleanup function to restore user app settings when leaving admin
    return () => {
      console.log('[AdminHead] Restoring user PWA metadata...');
      
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink) {
        manifestLink.setAttribute('href', '/manifest.json');
      }

      const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#e11b70');
      }

      const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      appleTouchIcons.forEach(icon => {
        icon.setAttribute('href', '/assets/icons/apple-touch-icon.png');
      });
    };
  }, []);

  return null;
}
