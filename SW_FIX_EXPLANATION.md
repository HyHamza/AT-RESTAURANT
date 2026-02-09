# Service Worker Hanging Issue - Root Cause Analysis & Fix

## Problem Summary
The app was hanging/stuck on loading when opened in multiple tabs or after refresh due to Service Worker registration conflicts and fetch handler issues.

## Root Causes Identified

### 1. **Redundant Registration on Route Changes**
**Issue**: The registration logic used `sessionStorage` which doesn't persist across route changes in Next.js client-side navigation. This caused re-registration attempts on every route change.

**Fix**: Implemented a global `window.__SW_REGISTERED__` flag that persists across React re-renders and route changes, ensuring registration happens only once per session.

### 2. **Promise.race() Timeout Deadlocks**
**Issue**: Multiple `Promise.race()` calls with timeout promises in the fetch handler could reject without proper fallback, causing unhandled promise rejections that blocked the fetch event.

**Fix**: Removed all `Promise.race()` timeout patterns and replaced with simple promise chains that always return a response. The fetch event MUST always respond, never throw.

### 3. **Lifecycle Management Issues**
**Issue**: While `skipWaiting()` and `clients.claim()` were present, the registration logic didn't handle controller changes properly, causing multiple SW versions to conflict.

**Fix**: 
- Added immediate `skipWaiting()` in install event
- Added immediate `clients.claim()` in activate event
- Added `controllerchange` listener that reloads the page when a new SW takes control
- Removed state tracking variables (`isInstalling`, `isActivated`) that could cause race conditions

### 4. **Vercel Cache-Control Too Permissive**
**Issue**: `Cache-Control: public, max-age=0, must-revalidate` still allows caching with revalidation. Browsers could serve stale SW files.

**Fix**: Changed to `Cache-Control: no-cache, no-store, must-revalidate` to completely prevent caching of sw.js.

### 5. **Hydration Blocking**
**Issue**: Service Worker registration ran synchronously during component mount, potentially blocking React hydration and causing the UI to hang.

**Fix**: 
- Wrapped initialization in `requestIdleCallback()` to defer until after hydration
- Used `useRef` to ensure initialization runs only once per component lifetime
- Made all operations non-blocking with proper error handling

## Key Changes

### public/sw.js
1. **Simplified fetch handler**: Removed all `Promise.race()` timeouts
2. **Guaranteed responses**: Every fetch path now returns a response, never throws
3. **Immediate lifecycle**: `skipWaiting()` and `clients.claim()` happen immediately
4. **Version bump**: Changed to v3 to force update on all clients
5. **Cleaner code**: Reduced from 400+ lines to ~200 lines

### src/components/offline-init.tsx
1. **Global registration flag**: Prevents duplicate registrations across route changes
2. **Deferred initialization**: Uses `requestIdleCallback()` to avoid blocking hydration
3. **Single execution**: `useRef` ensures effect runs only once
4. **Auto-update handling**: New SW automatically activates and reloads the page
5. **Controller check**: Skips registration if already controlled by a SW

### vercel.json
1. **Stricter cache control**: `no-cache, no-store, must-revalidate` for sw.js
2. **Prevents edge caching**: Ensures fresh SW file on every request

## Testing Checklist

- [ ] Open app in single tab - should load normally
- [ ] Open app in multiple tabs simultaneously - no hanging
- [ ] Refresh page multiple times - no hanging
- [ ] Navigate between routes - no re-registration
- [ ] Close all tabs, reopen - should register once
- [ ] Check DevTools > Application > Service Workers - should show single active worker
- [ ] Check Console - should see "[SW] Loaded v3" only once
- [ ] Deploy to Vercel - verify sw.js has correct headers

## Performance Improvements

- **Reduced SW file size**: 400+ lines → ~200 lines
- **Eliminated timeouts**: No more Promise.race() overhead
- **Deferred initialization**: Doesn't block hydration
- **Single registration**: No duplicate network requests
- **Faster activation**: Immediate skipWaiting() and claim()

## Migration Notes

When deploying this fix:
1. All existing clients will update to v3 automatically
2. Old caches (v1, v2) will be cleaned up automatically
3. No manual cache clearing required
4. Users may see one page reload when the new SW activates

## Monitoring

After deployment, monitor for:
- Console errors related to Service Worker
- Network tab for sw.js requests (should not be cached)
- Application tab showing single active SW
- No hanging on page load or refresh
