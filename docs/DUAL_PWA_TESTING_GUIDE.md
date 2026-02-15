# Dual PWA Installation Testing Guide

## Overview
This guide helps you test the dual PWA system where both User App and Admin App can be installed independently as separate applications.

## Prerequisites
- Development server running (`npm run dev`)
- Modern browser (Chrome, Edge, or Safari)
- Mobile device or desktop for testing

## Testing Checklist

### 1. User App Testing

#### Desktop (Chrome/Edge)
1. **Navigate to Homepage**
   - Open `http://localhost:3000/`
   - Open DevTools (F12) → Application tab

2. **Verify User Manifest**
   - Go to Application → Manifest
   - Check:
     - ✅ Name: "AT Restaurant"
     - ✅ Short name: "AT Restaurant"
     - ✅ Start URL: "/?source=pwa"
     - ✅ Scope: "/"
     - ✅ Theme color: "#E91E63" (pink)
     - ✅ Icons load correctly (user icons)

3. **Verify User Service Worker**
   - Go to Application → Service Workers
   - Check:
     - ✅ Source: `/sw.js`
     - ✅ Scope: `/`
     - ✅ Status: Activated and running

4. **Install User App**
   - Look for install button in address bar or use install prompt
   - Click "Install"
   - Verify app installs with user icon
   - Open installed app → should navigate to homepage

#### Mobile (Android/iOS)
1. **Navigate to Homepage**
   - Open `http://localhost:3000/` in mobile browser

2. **iOS Safari**
   - Tap Share button (⬆️)
   - Select "Add to Home Screen"
   - Verify icon and name: "AT Restaurant"
   - Tap "Add"
   - Open from home screen → should go to homepage

3. **Android Chrome**
   - Wait for install prompt or tap menu → "Install app"
   - Verify icon and name: "AT Restaurant"
   - Tap "Install"
   - Open from app drawer → should go to homepage

### 2. Admin App Testing

#### Desktop (Chrome/Edge)
1. **Navigate to Admin Panel**
   - Open `http://localhost:3000/admin`
   - Login with admin credentials
   - Open DevTools (F12) → Application tab

2. **Verify Admin Manifest**
   - Go to Application → Manifest
   - Check:
     - ✅ Name: "AT Restaurant Admin Panel"
     - ✅ Short name: "Admin"
     - ✅ Start URL: "/admin?source=pwa"
     - ✅ Scope: "/admin/"
     - ✅ Theme color: "#1F2937" (dark gray)
     - ✅ Icons load correctly (admin icons - should be different from user)

3. **Verify Admin Service Worker**
   - Go to Application → Service Workers
   - Check:
     - ✅ Source: `/admin-sw.js`
     - ✅ Scope: `/admin/`
     - ✅ Status: Activated and running

4. **Install Admin App**
   - Look for install button in address bar or admin install prompt
   - Click "Install Admin App"
   - Verify app installs with admin icon (different from user app)
   - Open installed app → should navigate directly to `/admin`

#### Mobile (Android/iOS)
1. **Navigate to Admin Panel**
   - Open `http://localhost:3000/admin` in mobile browser
   - Login with admin credentials

2. **iOS Safari**
   - Tap Share button (⬆️)
   - Select "Add to Home Screen"
   - Verify icon and name: "Admin" or "Admin Panel"
   - Tap "Add"
   - Open from home screen → should go directly to admin dashboard

3. **Android Chrome**
   - Wait for admin install prompt or tap menu → "Install app"
   - Verify icon and name: "Admin"
   - Tap "Install"
   - Open from app drawer → should go directly to admin dashboard

### 3. Dual Installation Verification

#### Both Apps Installed
1. **Check Home Screen/App Drawer**
   - ✅ Two separate app icons visible
   - ✅ User app icon (pink/restaurant theme)
   - ✅ Admin app icon (dark/admin theme)
   - ✅ Different names: "AT Restaurant" vs "Admin"

2. **Test Independent Operation**
   - Open User App → navigates to homepage
   - Open Admin App → navigates to admin dashboard
   - Both apps can run simultaneously
   - Each app maintains its own state

3. **Test Service Worker Isolation**
   - Open DevTools in User App
   - Check Service Workers → should see `/sw.js` with scope `/`
   - Open DevTools in Admin App
   - Check Service Workers → should see `/admin-sw.js` with scope `/admin/`

### 4. Offline Testing

#### User App Offline
1. Open User App
2. Go offline (DevTools → Network → Offline)
3. Navigate to `/menu`, `/order`, `/dashboard`
4. ✅ Pages should load from cache
5. ✅ Offline indicator should appear

#### Admin App Offline
1. Open Admin App
2. Go offline (DevTools → Network → Offline)
3. Navigate to `/admin/orders`, `/admin/menu`
4. ✅ Pages should load from cache
5. ✅ Admin offline message should appear

### 5. Update Testing

#### User App Update
1. Make changes to user service worker
2. Reload user app
3. ✅ New service worker should install
4. ✅ Update notification should appear (if implemented)

#### Admin App Update
1. Make changes to admin service worker
2. Reload admin app
3. ✅ New service worker should install
4. ✅ Admin app should update independently

## Common Issues & Solutions

### Issue: Both apps install as the same app
**Solution**: 
- Check manifest `scope` values are different
- User: `"scope": "/"`
- Admin: `"scope": "/admin/"`
- Clear browser cache and reinstall

### Issue: Admin app opens to homepage instead of admin dashboard
**Solution**:
- Verify admin manifest `start_url` is `/admin?source=pwa`
- Check admin service worker scope is `/admin/`

### Issue: Icons are the same for both apps
**Solution**:
- Verify admin icons exist in `/public/assets/admin-icons/`
- Check admin manifest points to admin icons
- Generate distinct admin icons (see `scripts/generate-admin-icons.md`)

### Issue: Service workers conflict
**Solution**:
- Unregister all service workers
- Clear all caches
- Reload and re-register each service worker

### Issue: Install prompt doesn't appear
**Solution**:
- Check browser console for errors
- Verify manifest is valid (DevTools → Application → Manifest)
- Clear localStorage items: `pwa-install-prompt-seen`, `admin-pwa-install-prompt-seen`
- Try incognito/private mode

## Browser DevTools Commands

### Unregister All Service Workers
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister())
})
```

### Clear All Caches
```javascript
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

### Check Current Service Worker
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('SW:', reg.active?.scriptURL, 'Scope:', reg.scope)
  })
})
```

### Force Install Prompt
```javascript
// Clear seen flags
localStorage.removeItem('pwa-install-prompt-seen')
localStorage.removeItem('admin-pwa-install-prompt-seen')
// Reload page
location.reload()
```

## Production Testing

### Before Deployment
- [ ] User manifest valid and accessible
- [ ] Admin manifest valid and accessible
- [ ] User service worker registers correctly
- [ ] Admin service worker registers correctly
- [ ] Both apps installable independently
- [ ] Icons are distinct and professional
- [ ] Start URLs work correctly
- [ ] Scopes don't conflict
- [ ] Offline functionality works
- [ ] Both apps can run simultaneously

### After Deployment
- [ ] Test on real devices (iOS and Android)
- [ ] Verify HTTPS is working
- [ ] Check service worker registration on production
- [ ] Test install flow on multiple browsers
- [ ] Verify icons display correctly
- [ ] Test offline functionality
- [ ] Check analytics/tracking works

## Success Criteria

✅ User app installs with restaurant branding, opens to homepage
✅ Admin app installs with admin branding, opens to admin dashboard
✅ Both apps appear as separate entries on device
✅ Each app has distinct icon and name
✅ Both can be installed and run simultaneously
✅ No conflicts between service workers
✅ Each app works offline independently
✅ Admin can access admin panel directly from dedicated app
✅ Users get customer app experience
✅ Clear visual distinction between the two apps

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify manifest files are valid JSON
3. Check service worker registration logs
4. Clear all caches and service workers
5. Test in incognito/private mode
6. Try different browser/device
