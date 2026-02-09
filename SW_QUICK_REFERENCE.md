# Service Worker Quick Reference

## What Was Fixed

### The Problem
App hung/froze when:
- Opening multiple tabs
- Refreshing the page
- Navigating between routes

### Root Causes
1. **Redundant registrations** - SW re-registered on every route change
2. **Promise.race() deadlocks** - Timeout promises caused unhandled rejections
3. **Multiple SW versions** - Old and new workers conflicted
4. **Cached sw.js** - Vercel served stale service worker files
5. **Hydration blocking** - Registration blocked React hydration

### The Solution
1. **Global registration flag** - `window.__SW_REGISTERED__` prevents duplicates
2. **Simplified fetch handlers** - Removed all Promise.race() timeouts
3. **Immediate lifecycle** - `skipWaiting()` and `clients.claim()` happen instantly
4. **Strict cache control** - `no-cache, no-store` for sw.js
5. **Deferred initialization** - `requestIdleCallback()` prevents hydration blocking

## File Changes

### `public/sw.js`
- Version bumped to v3
- Removed Promise.race() timeouts (400+ lines → 200 lines)
- Simplified fetch handlers
- Immediate skipWaiting() and clients.claim()
- Every fetch path returns a response

### `src/components/offline-init.tsx`
- Global `window.__SW_REGISTERED__` flag
- `useRef` for single execution
- `requestIdleCallback()` for deferred init
- Auto-reload on controller change
- Checks for existing controller before registering

### `vercel.json`
- Changed sw.js cache control to `no-cache, no-store, must-revalidate`

## Testing Commands

```bash
# Local testing
npm run dev

# Open in browser
http://localhost:3000

# Test diagnostic tool
http://localhost:3000/sw-test.html

# Deploy to Vercel
vercel --prod
```

## Console Output (Expected)

### First Load
```
[SW] Loaded v3
[SW] Installing v3...
[SW] Precache complete
[SW] Skipped waiting
[SW] Activating v3...
[SW] Claimed all clients
[SW] Registered successfully
```

### Subsequent Route Changes
```
[SW] Already registered or registering
```

### Multiple Tabs
```
Tab 1: [SW] Registered successfully
Tab 2: [SW] Already registered or registering
Tab 3: [SW] Already registered or registering
```

## DevTools Checks

### Application > Service Workers
- Should show: 1 active worker
- Should NOT show: waiting or installing workers (after initial load)
- Scope: `/`
- Status: `activated`

### Network > sw.js
- Status: `200 OK`
- Cache-Control: `no-cache, no-store, must-revalidate`
- Service-Worker-Allowed: `/`

### Console
- No errors
- No warnings about registration
- Clean logs with `[SW]` prefix

## Common Issues & Solutions

### Issue: "SW not registering"
**Solution**: Check if browser supports SW, check console for errors

### Issue: "Multiple SW versions"
**Solution**: Visit `/sw-test.html`, click "Unregister SW", reload

### Issue: "Still hanging after fix"
**Solution**: 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Close ALL tabs
3. Reopen app in new incognito window

### Issue: "Update not applying"
**Solution**: 
1. Check Vercel deployment logs
2. Verify sw.js has new content
3. Hard refresh (Ctrl+Shift+R)

## Performance Metrics

### Before Fix
- Multiple registrations per session
- Promise.race() overhead
- Blocking hydration
- Stale SW files from cache

### After Fix
- Single registration per session
- No timeout overhead
- Non-blocking initialization
- Always fresh SW files

### Expected Improvements
- ✅ Faster page loads
- ✅ No hanging/freezing
- ✅ Smoother navigation
- ✅ Better multi-tab experience

## Maintenance

### Updating the Service Worker
1. Edit `public/sw.js`
2. Bump `CACHE_VERSION` (e.g., v3 → v4)
3. Test locally
4. Deploy
5. Users auto-update on next visit

### Adding New Cache Strategies
```javascript
// Example: Add new cache
const NEW_CACHE = `at-restaurant-new-${CACHE_VERSION}`

// Add to valid caches in activate event
const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, VIDEO_CACHE, NEW_CACHE]
```

### Debugging Tips
1. Use `/sw-test.html` for diagnostics
2. Check `window.__SW_REGISTERED__` in console
3. Monitor Network tab for sw.js requests
4. Use Application > Service Workers panel
5. Enable "Update on reload" during development

## Support Resources

- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Vercel Headers Documentation](https://vercel.com/docs/edge-network/headers)
- [Chrome DevTools SW Debugging](https://developer.chrome.com/docs/devtools/progressive-web-apps/)

## Version History

- **v1**: Initial implementation (had hanging issues)
- **v2**: Added timeout handling (still had issues)
- **v3**: Complete rewrite with fixes (current)
