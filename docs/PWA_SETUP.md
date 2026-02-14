# PWA Installation Setup - AT Restaurant

This document explains the dual PWA installation setup for AT Restaurant, supporting both regular user and admin installations.

## Overview

The application now supports two separate PWA installations:

1. **User App** - For regular customers to browse menu and place orders
2. **Admin App** - For administrators to manage orders, menu, and users

Both apps can be installed independently on the same device and function as separate applications.

## Architecture

### Manifest Files

#### User Manifest (`/public/manifest.json`)
- **Start URL**: `/`
- **Scope**: `/` (entire application)
- **Theme Color**: `#E91E63` (Pink)
- **Name**: "AT Restaurant"
- **Shortcuts**: Menu, Orders

#### Admin Manifest (`/public/admin-manifest.json`)
- **Start URL**: `/admin`
- **Scope**: `/admin/` (admin section only)
- **Theme Color**: `#ea580c` (Orange)
- **Name**: "AT Restaurant Admin"
- **Shortcuts**: Orders, Menu, Users

### Service Workers

#### User Service Worker (`/public/sw.js`)
- Handles caching for the entire application
- Optimized for customer-facing features
- Excludes video caching for performance
- Provides offline fallback pages

#### Admin Service Worker (`/public/admin-sw.js`)
- Scoped to `/admin/` routes only
- Optimized for admin dashboard features
- Separate cache namespace to avoid conflicts
- Admin-specific offline fallback

### Components

#### User PWA Install (`src/components/pwa-install.tsx`)
- Displays install prompt for regular users
- Shows on any page outside admin section
- Delayed prompt (10 seconds after page load)
- iOS-specific installation instructions

#### Admin PWA Install (`src/components/admin-pwa-install.tsx`)
- Displays install prompt for admin users only
- Shows only within admin section
- Registers admin-specific service worker
- Separate installation tracking
- Delayed prompt (3 seconds after page load)

## How It Works

### Service Worker Scoping

The key to having two separate PWAs is using different **scopes**:

```javascript
// User SW - registered at root
navigator.serviceWorker.register('/sw.js', { scope: '/' })

// Admin SW - registered at /admin/
navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin/' })
```

Both service workers can coexist because they have different scopes. The browser will use the appropriate service worker based on the URL being accessed.

### Manifest Linking

The manifest is dynamically linked based on the current route:

- **Root Layout** (`src/app/layout.tsx`): Links to `/manifest.json`
- **Admin Layout** (`src/app/admin/layout.tsx`): Links to `/admin-manifest.json`

### Installation Flow

#### User App Installation
1. User visits any page on the site
2. User service worker registers automatically
3. After 10 seconds, install prompt appears (if not dismissed before)
4. User clicks "Install App"
5. Browser shows native install dialog
6. App installs with user manifest configuration

#### Admin App Installation
1. Admin logs into admin panel
2. Admin service worker registers for `/admin/` scope
3. After 3 seconds, admin install prompt appears
4. Admin clicks "Install Admin App"
5. Browser shows native install dialog
6. App installs with admin manifest configuration

### Separate App Icons

When both apps are installed:
- **User App Icon**: Opens to `/` (homepage)
- **Admin App Icon**: Opens to `/admin` (admin dashboard)

Each app maintains its own:
- Navigation history
- Session state
- Cache storage
- Service worker

## Installation Detection

The system tracks installations separately:

```typescript
// User app installation
localStorage.getItem('pwa-installed')
localStorage.getItem('pwa-install-prompt-seen')

// Admin app installation
localStorage.getItem('admin-pwa-installed')
localStorage.getItem('admin-pwa-install-prompt-seen')
```

## iOS Support

For iOS devices (which don't support the `beforeinstallprompt` event):

1. Install prompts show instructions for manual installation
2. Users must use Safari's "Add to Home Screen" feature
3. Separate instructions for user and admin apps
4. Each app can be added independently

### iOS Installation Steps

**User App:**
1. Open site in Safari
2. Tap Share button (⬆️)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"

**Admin App:**
1. Navigate to `/admin` in Safari
2. Tap Share button (⬆️)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"

## Testing

### Test User App Installation

1. Open the site in Chrome/Edge (desktop or mobile)
2. Wait for install prompt or check browser menu
3. Install the app
4. Verify app opens to homepage
5. Check that app works offline

### Test Admin App Installation

1. Log in as admin user
2. Navigate to admin dashboard
3. Wait for admin install prompt
4. Install the admin app
5. Verify app opens to `/admin`
6. Check that both apps are installed separately

### Verify Separate Installations

1. Install both apps
2. Check home screen - should see two icons
3. Open user app - should start at `/`
4. Open admin app - should start at `/admin`
5. Verify each app maintains separate state

## Cache Management

### User App Caches
- `at-restaurant-v9` - Main cache
- `at-restaurant-runtime-v9` - Runtime cache
- `at-restaurant-api-v9` - API cache

### Admin App Caches
- `at-restaurant-admin-v1` - Main cache
- `at-restaurant-admin-runtime-v1` - Runtime cache
- `at-restaurant-admin-api-v1` - API cache

Caches are completely separate and won't conflict.

## Updating Service Workers

### User SW Update
1. Modify `/public/sw.js`
2. Update `CACHE_VERSION` constant
3. Deploy changes
4. Users will get update on next visit

### Admin SW Update
1. Modify `/public/admin-sw.js`
2. Update `CACHE_VERSION` constant
3. Deploy changes
4. Admins will get update on next visit

## Troubleshooting

### Issue: Install prompt doesn't appear

**Solution:**
- Clear browser cache and localStorage
- Ensure HTTPS is enabled (required for PWA)
- Check browser console for errors
- Verify service worker registration

### Issue: Both apps open to same page

**Solution:**
- Check manifest `start_url` and `scope` settings
- Verify service worker scope registration
- Clear all service workers and reinstall

### Issue: Service workers conflict

**Solution:**
- Ensure different scopes (`/` vs `/admin/`)
- Check that cache names are different
- Unregister all service workers and start fresh

### Issue: Admin app not installing

**Solution:**
- Verify user has admin privileges
- Check that admin service worker registers
- Ensure `/admin-manifest.json` is accessible
- Check browser console for errors

## Browser Support

### Full Support (Install Prompt)
- Chrome 67+ (Android, Desktop)
- Edge 79+ (Desktop, Android)
- Samsung Internet 8.2+
- Opera 54+

### Manual Installation Only
- Safari (iOS, macOS) - Use "Add to Home Screen"
- Firefox - Limited PWA support

### Not Supported
- Internet Explorer
- Older browser versions

## Security Considerations

1. **HTTPS Required**: PWAs only work over HTTPS
2. **Admin Authentication**: Admin app requires login
3. **Separate Sessions**: Each app maintains its own session
4. **Cache Isolation**: Caches are scoped separately

## Performance

### User App
- Optimized for customer experience
- Excludes large video files from cache
- Fast menu browsing offline
- Order history available offline

### Admin App
- Optimized for admin tasks
- Caches admin dashboard
- Real-time order notifications
- Offline order management

## Future Enhancements

Potential improvements:

1. **Push Notifications**: Separate notification channels for user and admin
2. **Background Sync**: Sync orders when connection restored
3. **Periodic Background Sync**: Update menu data automatically
4. **Share Target**: Allow sharing items to the app
5. **Shortcuts**: Add more app shortcuts for quick actions

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
