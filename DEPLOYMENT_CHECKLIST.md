# Service Worker Fix - Deployment Checklist

## Pre-Deployment

- [x] Updated `public/sw.js` to v3 with fixes
- [x] Updated `src/components/offline-init.tsx` with proper registration logic
- [x] Updated `vercel.json` with stricter cache control
- [x] Created test page at `/sw-test.html`
- [x] Verified no TypeScript/linting errors

## Deploy Steps

1. **Commit changes**
   ```bash
   git add public/sw.js src/components/offline-init.tsx vercel.json
   git commit -m "fix: resolve service worker hanging issues in multiple tabs"
   git push
   ```

2. **Deploy to Vercel**
   - Push will trigger automatic deployment
   - Or manually deploy: `vercel --prod`

3. **Verify deployment**
   - Check Vercel deployment logs
   - Verify sw.js is deployed
   - Check response headers for sw.js

## Post-Deployment Testing

### Test 1: Single Tab
1. Open app in incognito/private window
2. Open DevTools > Console
3. Look for: `[SW] Loaded v3`
4. Check Application > Service Workers
5. Should show single active worker

### Test 2: Multiple Tabs
1. Open app in 3-4 tabs simultaneously
2. Check console in each tab
3. Should see registration only in first tab
4. Other tabs should see "Already registered or registering"
5. No hanging or freezing

### Test 3: Refresh Test
1. Open app
2. Refresh page 5-10 times rapidly
3. Should not hang
4. Should not re-register SW

### Test 4: Route Navigation
1. Open app
2. Navigate between pages (menu, order, settings)
3. Check console - should NOT see new registrations
4. Should see `window.__SW_REGISTERED__ = true`

### Test 5: Cache Headers
1. Open DevTools > Network
2. Reload page
3. Find sw.js request
4. Check Response Headers:
   - `Cache-Control: no-cache, no-store, must-revalidate`
   - `Service-Worker-Allowed: /`

### Test 6: Update Flow
1. Make a small change to sw.js (e.g., change console.log message)
2. Deploy
3. Reload app
4. Should see new SW installing
5. Page should reload automatically when new SW activates

## Diagnostic Tool

Access the diagnostic tool at: `https://your-domain.com/sw-test.html`

This tool provides:
- Real-time SW status
- Cache inspection
- Registration flags check
- Unregister/clear cache actions
- Live logging

## Rollback Plan

If issues occur:

1. **Quick rollback**
   ```bash
   git revert HEAD
   git push
   ```

2. **Manual fix**
   - Revert `public/sw.js` to previous version
   - Keep `vercel.json` changes (cache headers are safe)
   - Deploy

3. **Clear user caches**
   - Users can visit `/sw-test.html`
   - Click "Unregister SW" and "Clear All Caches"
   - Reload page

## Monitoring

After deployment, monitor for 24-48 hours:

### Metrics to Watch
- [ ] Page load time (should improve)
- [ ] Error rate (should decrease)
- [ ] User reports of hanging (should be zero)
- [ ] Console errors related to SW (should be minimal)

### Vercel Analytics
- Check for increased error rates
- Monitor Core Web Vitals (FCP, LCP, CLS)
- Check bounce rate (should not increase)

### Browser Console Monitoring
Expected logs:
```
[SW] Loaded v3
[SW] Installing v3...
[SW] Precache complete
[SW] Skipped waiting
[SW] Activating v3...
[SW] Claimed all clients
[SW] Already registered or registering (on subsequent route changes)
```

## Success Criteria

✅ No hanging on page load
✅ No hanging with multiple tabs
✅ No hanging on refresh
✅ Single SW registration per session
✅ Proper cache headers on sw.js
✅ Automatic updates work correctly
✅ No console errors
✅ Improved page load performance

## Support

If users report issues:

1. Ask them to visit `/sw-test.html`
2. Click "Unregister SW" and "Clear All Caches"
3. Close all tabs
4. Reopen app
5. If still broken, clear browser cache manually

## Notes

- Old clients (v1, v2) will auto-update to v3
- One-time page reload expected during update
- No data loss (IndexedDB unaffected)
- Offline functionality preserved
- All caching strategies maintained
