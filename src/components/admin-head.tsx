'use client'

import { useEffect } from 'react'

export function AdminHead() {
  useEffect(() => {
    console.log('[AdminHead] Configuring admin PWA metadata...');

    // Update manifest link to admin manifest
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
      themeColorMeta.setAttribute('content', '#1F2937');
    } else {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      themeColorMeta.content = '#1F2937';
      document.head.appendChild(themeColorMeta);
    }

    // Update apple touch icons to admin icons
    const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
    appleTouchIcons.forEach(icon => {
      const href = icon.getAttribute('href');
      if (href && !href.includes('admin-icons')) {
        const newHref = href.replace('/assets/icons/', '/assets/admin-icons/admin-');
        icon.setAttribute('href', newHref);
      }
    });

    // Update app title metadata
    let appNameMeta = document.querySelector('meta[name="application-name"]') as HTMLMetaElement;
    if (appNameMeta) {
      appNameMeta.setAttribute('content', 'Admin Panel');
    } else {
      appNameMeta = document.createElement('meta');
      appNameMeta.name = 'application-name';
      appNameMeta.content = 'Admin Panel';
      document.head.appendChild(appNameMeta);
    }

    let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', 'Admin');
    } else {
      appleTitleMeta = document.createElement('meta');
      appleTitleMeta.name = 'apple-mobile-web-app-title';
      appleTitleMeta.content = 'Admin';
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
    };
  }, []);

  return null;
}
