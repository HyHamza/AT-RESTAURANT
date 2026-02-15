# Offline-First PWA Implementation

## Overview

This document describes the complete offline-first implementation for the AT Restaurant PWA, including pre-caching of all public pages, graceful Supabase handling, and zero-error offline experience.

## Architecture

### Service Worker (v10)

**Location:** `public/sw.js`

The service worker implements a comprehensive offline-first strategy with the following features:

#### 1. Complete Pre-caching on Install

During the `install` event, the service worker pre-caches:

- **All Public Pages:**
  - `/` (home)
  - `/menu`
  - `/order`
  - `/dashboard`
  - `/settings`
  - `/location`
  - `/order-status`
  - `/privacy`
  - `/terms`
  - `/offline`
  - `/login`
  - `/signup`

- **Essential Assets:**
  - Manifest file
  - All favicon variants
  - App icons (192x192, 512x512)
  - Apple touch icon

#### 2. Caching Strategies

**Pages (Navigation Requests):**
- Strategy: Cache-first with background update
- Pre-cached pages served instantly from cache
- Background fetch updates cache when online
- Fallback to offline page if not cached

**Next.js Chunks (`/_next/static/`):**
- Strategy: Cache-first with network fallback
- All JavaScript and CSS chunks cached on first load
- Prevents chunk loading errors when offline
- Empty responses returned for missing chunks to prevent errors

**API Routes (`/api/`):**
- Strategy: Network-first with cache fallback
- Fresh data when online
- Cached data when offline
- Offline indicator in response

**Supabase Requests:**
- Strategy: Network-first with timeout and offline detection
- 5-second timeout to prevent hanging
- Automatic offline detection
- Cached responses when available
- Graceful offline responses

**Static Assets:**
- Strategy: Cache-first with stale-while-revalidate
- Images, fonts, and other assets cached indefinitely
- Background updates when online
- Placeholder images for failed loads

**Videos:**
- Strategy: Network-only (never cached)
- Prevents large video files from blocking cache
- Graceful error handling when offline

#### 3. Offline Detection

The service worker actively detects offline state using:
- `navigator.onLine` API
- Network request failures
- Request timeouts

When offline:
- Supabase requests are blocked and return cached data
- External API calls return offline responses
- All cached resources served instantly
- No network errors in console

### Supabase Offline Handler

**Location:** `src/lib/supabase-offline-handler.ts`

Wraps the Supabase client to intercept requests when offline:

#### Features:

1. **Query Interception:**
   - Blocks SELECT, INSERT, UPDATE, DELETE when offline
   - Returns proper error responses with offline indicators
   - Prevents "Failed to fetch" errors

2. **Auth Handling:**
   - Blocks sign-in/sign-up when offline
   - Returns cached session data when available
   - Allows sign-out offline (clears local storage)
   - Prevents token refresh loops

3. **Graceful Degradation:**
   - All methods return proper response objects
   - Error messages indicate offline state
   - No thrown exceptions or unhandled promises

### Offline Initialization

**Location:** `src/components/offline-init.tsx`

Handles service worker registration and initialization:

#### Features:

1. **Deferred Registration:**
   - Uses `requestIdleCallback` to prevent blocking
   - Runs after page is fully loaded
   - No impact on initial page load performance

2. **Update Handling:**
   - Automatic detection of new service worker versions
   - Skip waiting for immediate activation
   - Auto-reload when new version is activated

3. **Menu Pre-caching:**
   - Caches menu data from Supabase
   - Stores in IndexedDB for offline access
   - Sends to service worker for API cache

### Build Manifest Generator

**Location:** `scripts/generate-sw-manifest.js`

Generates a manifest of all build assets for pre-caching:

#### Features:

1. **Asset Discovery:**
   - Scans `.next/static/` directory
   - Categorizes assets (JS, CSS, images, fonts)
   - Creates comprehensive manifest

2. **Build Integration:**
   - Runs automatically after `next build`
   - Outputs to `public/sw-manifest.json`
   - Can be used for advanced pre-caching strategies

## Usage

### Development

```bash
npm run dev
```

Service worker is registered but may not pre-cache in development mode.

### Production Build

```bash
npm run build
npm start
```

1. Next.js builds the application
2. Manifest generator scans build output
3. Service worker pre-caches all pages on first visit
4. All pages available offline immediately

### Testing Offline

1. Open the app in a browser
2. Wait for service worker to install (check console)
3. Open DevTools > Application > Service Workers
4. Check "Offline" checkbox
5. Navigate to any page - should work instantly
6. Check console - no errors

## Monitoring

### Service Worker Status

Check service worker status in console:

```javascript
navigator.serviceWorker.ready.then(registration => {
  console.log('Service Worker Status:', registration.active?.state)
})
```

### Cached Pages

Get list of cached pages:

```javascript
const channel = new MessageChannel()
channel.port1.onmessage = (event) => {
  console.log('Cached Pages:', event.data.cachedPages)
}
navigator.serviceWorker.controller.postMessage(
  { type: 'GET_CACHED_PAGES' },
  [channel.port2]
)
```

### Cache Size

Check cache storage usage:

```javascript
navigator.storage.estimate().then(estimate => {
  console.log('Cache Usage:', {
    used: (estimate.usage / 1024 / 1024).toFixed(2) + ' MB',
    quota: (estimate.quota / 1024 / 1024).toFixed(2) + ' MB',
    percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2) + '%'
  })
})
```

## Troubleshooting

### Service Worker Not Installing

1. Check browser console for errors
2. Verify `/sw.js` is accessible
3. Ensure HTTPS (or localhost)
4. Clear browser cache and reload

### Pages Not Cached

1. Check service worker is active
2. Verify pages are in `PRECACHE_PAGES` array
3. Check network tab for 200 responses during install
4. Look for errors in service worker console

### Supabase Errors When Offline

1. Verify offline handler is imported in `supabase.ts`
2. Check console for "Blocking Supabase request" messages
3. Ensure `createOfflineAwareSupabase` is wrapping client

### Chunk Loading Errors

1. Verify `/_next/static/` requests are cached
2. Check service worker is intercepting chunk requests
3. Look for empty responses being returned for missing chunks

## Performance

### Initial Load

- Service worker registration: ~50ms
- Pre-caching: 2-5 seconds (background)
- No impact on page load time

### Offline Navigation

- Cached pages: <100ms
- No network requests
- Instant page transitions

### Cache Size

- Pages: ~500KB - 2MB
- Chunks: ~1-3MB
- Assets: ~500KB
- Total: ~2-6MB

## Best Practices

1. **Always test offline:**
   - Use DevTools offline mode
   - Test on real devices with airplane mode
   - Verify no console errors

2. **Monitor cache size:**
   - Keep total cache under 50MB
   - Clean old caches on activation
   - Use cache expiration for dynamic content

3. **Handle errors gracefully:**
   - Always return proper Response objects
   - Never throw in service worker
   - Provide offline indicators in UI

4. **Update strategy:**
   - Increment cache version on changes
   - Clean old caches on activation
   - Auto-reload on new version

5. **Test edge cases:**
   - Slow 3G connections
   - Intermittent connectivity
   - Cache quota exceeded
   - Service worker update during navigation

## Future Enhancements

1. **Background Sync:**
   - Queue orders when offline
   - Sync when connection restored
   - Retry failed requests

2. **Push Notifications:**
   - Order status updates
   - Promotional offers
   - Re-engagement campaigns

3. **Advanced Caching:**
   - Predictive pre-caching
   - User-specific content
   - Dynamic cache management

4. **Analytics:**
   - Offline usage tracking
   - Cache hit rates
   - Performance metrics

## Resources

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Best Practices](https://web.dev/pwa/)
