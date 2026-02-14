# Offline Testing Guide - Quick Start

## 🚀 Quick Test (5 Minutes)

### Step 1: Build and Start
```bash
npm run build
npm start
```

### Step 2: Open Browser
1. Navigate to `http://localhost:3000`
2. Open DevTools (F12)
3. Go to Console tab

### Step 3: Wait for Service Worker
Look for this message in console:
```
[SW v10] Fully activated - Offline-first ready!
[SW v10] ✓ Cached page: /
[SW v10] ✓ Cached page: /menu
[SW v10] ✓ Cached page: /order
... (all 12 pages)
```

### Step 4: Go Offline
**Option A - DevTools:**
1. Open DevTools > Application tab
2. Click "Service Workers" in sidebar
3. Check "Offline" checkbox

**Option B - Network Tab:**
1. Open DevTools > Network tab
2. Change throttling dropdown to "Offline"

**Option C - Real Offline:**
1. Turn on Airplane Mode
2. Or disconnect WiFi

### Step 5: Test Navigation
Click these links and verify they load instantly:
- ✅ Home (/)
- ✅ Menu (/menu)
- ✅ Order (/order)
- ✅ Dashboard (/dashboard)
- ✅ Settings (/settings)

### Step 6: Check Console
You should see:
```
[SW v10] Serving pre-cached page: /menu
[Supabase Offline] Blocking getSession (offline)
```

You should NOT see:
- ❌ ERR_NAME_NOT_RESOLVED
- ❌ Failed to fetch
- ❌ Chunk loading errors
- ❌ 503 errors (except videos)

## ✅ Success Checklist

- [ ] Service worker installed (check console)
- [ ] All 12 pages pre-cached (check console)
- [ ] Can navigate offline (no errors)
- [ ] Console is clean (no red errors)
- [ ] Pages load instantly
- [ ] Supabase requests blocked gracefully

## 🔍 Detailed Verification

### Verify Pre-cached Pages

**In Console:**
```javascript
caches.open('at-restaurant-pages-v10').then(cache => {
  cache.keys().then(keys => {
    console.log('Cached Pages:', keys.length)
    keys.forEach(k => console.log('  -', new URL(k.url).pathname))
  })
})
```

**Expected Output:**
```
Cached Pages: 12
  - /
  - /menu
  - /order
  - /dashboard
  - /settings
  - /location
  - /order-status
  - /privacy
  - /terms
  - /offline
  - /login
  - /signup
```

### Verify Service Worker Status

**In Console:**
```javascript
navigator.serviceWorker.ready.then(reg => {
  console.log('SW State:', reg.active?.state)
  console.log('SW Script:', reg.active?.scriptURL)
})
```

**Expected Output:**
```
SW State: activated
SW Script: http://localhost:3000/sw.js
```

### Verify Cache Size

**In Console:**
```javascript
navigator.storage.estimate().then(est => {
  const used = (est.usage / 1024 / 1024).toFixed(2)
  const quota = (est.quota / 1024 / 1024).toFixed(2)
  const percent = ((est.usage / est.quota) * 100).toFixed(2)
  console.log(`Cache: ${used} MB / ${quota} MB (${percent}%)`)
})
```

**Expected Output:**
```
Cache: 2.5 MB / 2048.0 MB (0.12%)
```

## 🧪 Advanced Testing

### Test 1: Cold Start Offline
1. Clear all caches (DevTools > Application > Clear Storage)
2. Close browser
3. Turn on Airplane Mode
4. Open browser and navigate to app
5. **Expected:** Offline page shows with cached page list

### Test 2: Partial Cache
1. Clear caches
2. Visit only home page (/)
3. Go offline
4. Try to visit /menu
5. **Expected:** Menu page loads (pre-cached)

### Test 3: Supabase Offline
1. Go offline
2. Try to sign in
3. **Expected:** Error message "Cannot sign in while offline"
4. Check console for: `[Supabase Offline] Blocking signIn (offline)`

### Test 4: Chunk Loading
1. Go offline
2. Navigate between pages rapidly
3. **Expected:** No chunk loading errors
4. Check console for: `[SW v10] Serving cached chunk: ...`

### Test 5: API Calls
1. Go offline
2. Try to load menu data
3. **Expected:** Cached data shown or offline message
4. Check console for: `[SW v10] Serving cached API response`

## 📊 Performance Benchmarks

### Initial Load (Online)
- Page load: < 2 seconds
- SW install: < 1 second
- Pre-cache: 2-5 seconds (background)

### Offline Navigation
- Page load: < 100ms
- No network requests
- Instant transitions

### Cache Size
- Pages: ~1-2 MB
- Chunks: ~1-3 MB
- Assets: ~500 KB
- Total: ~2-6 MB

## 🐛 Common Issues

### Issue: Service Worker Not Installing

**Symptoms:**
- No console messages from SW
- Pages not cached

**Solutions:**
1. Hard refresh: `Ctrl+Shift+R`
2. Check HTTPS (or localhost)
3. Verify `/sw.js` is accessible
4. Check browser console for errors

### Issue: Pages Not Pre-cached

**Symptoms:**
- Console shows install but no cache messages
- Pages fail offline

**Solutions:**
1. Wait 5 seconds after install
2. Check network tab for 200 responses
3. Verify pages exist and return HTML
4. Check service worker console for errors

### Issue: Still Seeing Errors Offline

**Symptoms:**
- Console shows errors when offline
- Chunk loading failures

**Solutions:**
1. Verify SW version is v10 (check console)
2. Clear all caches and reload
3. Unregister old service workers
4. Check that offline handler is imported

### Issue: Supabase Errors

**Symptoms:**
- "Failed to fetch" errors
- Token refresh loops

**Solutions:**
1. Verify `supabase-offline-handler.ts` exists
2. Check `supabase.ts` imports offline handler
3. Verify `createOfflineAwareSupabase` is used
4. Check console for blocking messages

## 📱 Mobile Testing

### iOS Safari
1. Open in Safari
2. Add to Home Screen
3. Open as app
4. Turn on Airplane Mode
5. Test navigation

### Android Chrome
1. Open in Chrome
2. Install PWA (banner or menu)
3. Open as app
4. Turn on Airplane Mode
5. Test navigation

## 🎯 Test Scenarios

### Scenario 1: First-Time User
1. User visits app (online)
2. SW installs and pre-caches
3. User goes offline
4. User can browse all pages
5. **Expected:** Full offline access

### Scenario 2: Returning User
1. User opens app (offline)
2. All pages load instantly
3. User can navigate freely
4. **Expected:** Zero errors

### Scenario 3: Intermittent Connection
1. User browses online
2. Connection drops
3. User continues browsing
4. Connection returns
5. **Expected:** Seamless experience

### Scenario 4: Order Placement
1. User adds items to cart (online)
2. Goes offline
3. Tries to place order
4. **Expected:** Offline message, order queued

## 📈 Success Metrics

### Must Have (Critical)
- ✅ Zero console errors offline
- ✅ All pages accessible offline
- ✅ No chunk loading errors
- ✅ No Supabase auth loops

### Should Have (Important)
- ✅ Pre-cache completes in < 5 seconds
- ✅ Offline navigation < 100ms
- ✅ Cache size < 10 MB
- ✅ Graceful error messages

### Nice to Have (Optional)
- ✅ Background sync for orders
- ✅ Push notifications
- ✅ Predictive pre-caching
- ✅ Analytics tracking

## 🎉 You're Done!

If all tests pass, your PWA is fully offline-first and production-ready!

### Final Checklist
- [ ] All 12 pages pre-cached
- [ ] Zero errors offline
- [ ] Instant navigation
- [ ] Graceful Supabase handling
- [ ] Clean console
- [ ] Mobile tested
- [ ] Performance verified

### Next Steps
1. Deploy to production
2. Monitor cache usage
3. Track offline usage
4. Gather user feedback
5. Iterate and improve

---

**Need Help?**
- Check `docs/OFFLINE_FIRST_IMPLEMENTATION.md`
- Review `OFFLINE_IMPLEMENTATION_SUMMARY.md`
- Inspect service worker console logs
- Test with DevTools offline mode
