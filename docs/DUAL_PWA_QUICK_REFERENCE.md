# Dual PWA Quick Reference Card

## 🎯 The Critical Fix

The browser was treating both apps as one PWA. The fix requires **THREE critical changes**:

### 1. Unique Manifest IDs (MOST IMPORTANT)
```json
// User: /public/manifest.json
{
  "id": "com.atrestaurant.user",
  "scope": "/",
  "start_url": "/?source=pwa&app=user"
}

// Admin: /public/admin-manifest.json
{
  "id": "com.atrestaurant.admin",
  "scope": "/admin",
  "start_url": "/admin?source=pwa&app=admin"
}
```

### 2. Service Worker Scope Isolation
```javascript
// User SW (/public/sw.js) - Ignore admin routes
if (url.pathname.startsWith('/admin')) {
  return; // Don't handle admin routes
}

// Admin SW (/public/admin-sw.js) - Only handle admin routes
if (!url.pathname.startsWith('/admin')) {
  return; // Don't handle non-admin routes
}
```

### 3. Separate Service Worker Registration
```javascript
// User: scope "/"
navigator.serviceWorker.register('/sw.js', { scope: '/' })

// Admin: scope "/admin"
navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' })
```

## 🧪 Quick Test

### Before Testing - Full Reset
```
1. Visit: http://localhost:3000/pwa-cleanup.html
2. Click: "🔥 Full Cleanup (All)"
3. Close browser completely
4. Reopen browser
```

### Test User App
```
1. Go to: http://localhost:3000/
2. DevTools → Application → Manifest
3. Check ID: "com.atrestaurant.user" ✓
4. Install app
5. Verify: Opens to homepage
```

### Test Admin App
```
1. Go to: http://localhost:3000/admin
2. DevTools → Application → Manifest
3. Check ID: "com.atrestaurant.admin" ✓
4. Install app (separate from user app)
5. Verify: Opens to /admin dashboard
```

### Success Criteria
```
✓ Two separate app icons on homescreen
✓ User app opens to /
✓ Admin app opens to /admin
✓ No "Open in [wrong app]" prompts
```

## 🔍 Debug Commands

### Check Service Workers
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => console.log(r.scope, r.active?.scriptURL))
})
```

### Check Manifest IDs
```javascript
// User
fetch('/manifest.json').then(r => r.json()).then(m => console.log('User ID:', m.id))

// Admin
fetch('/admin-manifest.json').then(r => r.json()).then(m => console.log('Admin ID:', m.id))
```

### Unregister All SWs
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => r.unregister())
})
```

### Clear All Caches
```javascript
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

## ⚠️ Common Mistakes

### ❌ Wrong: Same ID
```json
// Both manifests
"id": "com.atrestaurant"  // WRONG - Same ID!
```

### ✅ Correct: Different IDs
```json
// User
"id": "com.atrestaurant.user"

// Admin
"id": "com.atrestaurant.admin"
```

### ❌ Wrong: Overlapping Scopes
```json
// User
"scope": "/"

// Admin
"scope": "/"  // WRONG - Same scope!
```

### ✅ Correct: Separate Scopes
```json
// User
"scope": "/"

// Admin
"scope": "/admin"  // Different scope
```

### ❌ Wrong: SW Handles All Routes
```javascript
// Admin SW
self.addEventListener('fetch', (event) => {
  // Handles ALL routes - WRONG!
  event.respondWith(...)
})
```

### ✅ Correct: SW Filters Routes
```javascript
// Admin SW
self.addEventListener('fetch', (event) => {
  if (!url.pathname.startsWith('/admin')) {
    return; // Ignore non-admin routes
  }
  event.respondWith(...)
})
```

## 📊 Verification Checklist

```
□ User manifest ID: com.atrestaurant.user
□ Admin manifest ID: com.atrestaurant.admin
□ User scope: /
□ Admin scope: /admin
□ User SW ignores /admin routes
□ Admin SW only handles /admin routes
□ Both apps install independently
□ Different icons on homescreen
□ User app opens to /
□ Admin app opens to /admin
```

## 🚨 If Still Not Working

1. **Full cleanup**: Use `/pwa-cleanup.html`
2. **Uninstall both PWAs** from device
3. **Close all tabs** for your site
4. **Close browser** completely
5. **Reopen browser** and test again
6. **Check console** for errors
7. **Try incognito mode**
8. **Test different browser**

## 📱 Platform-Specific Notes

### iOS Safari
- Use "Add to Home Screen" from share menu
- Both apps can be added separately
- Check different icons appear

### Android Chrome
- Install prompts appear automatically
- Both apps show in app drawer
- Can run simultaneously

### Desktop Chrome/Edge
- Install from address bar icon
- Both apps appear in app menu
- Can pin both to taskbar

## 🔗 Resources

- **Cleanup Tool**: `/pwa-cleanup.html`
- **Full Guide**: `/docs/DUAL_PWA_TESTING_GUIDE.md`
- **Implementation**: `/docs/DUAL_PWA_IMPLEMENTATION_SUMMARY.md`
- **Icon Guide**: `/scripts/generate-admin-icons.md`

## 💡 Key Takeaway

The `id` field in the manifest is what tells the browser these are **two different apps**. Without unique IDs, the browser treats them as the same app regardless of different scopes or service workers.

```json
"id": "com.atrestaurant.user"    // User app
"id": "com.atrestaurant.admin"   // Admin app - MUST BE DIFFERENT!
```
