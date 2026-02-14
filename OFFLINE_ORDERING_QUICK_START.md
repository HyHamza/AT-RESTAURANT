# Offline Ordering System - Quick Start Guide

## ✅ Status: Backend Implementation Complete

All backend services, database schemas, and utilities for the complete offline ordering system have been successfully implemented and tested.

---

## 🎯 What's Been Implemented

### ✅ Core Services
1. **Authentication Service** (`src/lib/auth-service.ts`)
   - Persistent session management
   - Offline authentication support
   - 24-hour session duration
   - Automatic session restoration

2. **Location Service** (`src/lib/location-service-enhanced.ts`)
   - Multiple address storage
   - GPS detection (works offline)
   - Reverse geocoding
   - Auto-fill last used location

3. **Enhanced Offline Database** (`src/lib/offline-db.ts`)
   - User session storage
   - Location caching
   - Enhanced order structure with location & discount data

4. **Sync Service** (`src/lib/sync-service.ts`)
   - Updated to sync enhanced order data
   - Handles location and discount fields

### ✅ React Hooks
1. **useAuth** (`src/hooks/use-auth.ts`)
2. **useLocation** (`src/hooks/use-location.ts`)

### ✅ Database Schema
- Added `user_locations` table
- Enhanced `users` table with PWA fields
- Enhanced `orders` table with location fields
- All indexes and triggers configured

---

## 🚀 Next Steps: UI Integration

To complete the implementation, integrate the new services into your UI components:

### Step 1: Update Order Page

**File**: `src/app/order/page.tsx`

Replace the current authentication logic with the new hooks:

```typescript
// Add imports at the top
import { useAuth } from '@/hooks/use-auth'
import { useLocation } from '@/hooks/use-location'

// Inside OrderContent component, replace existing auth logic:
function OrderContent() {
  // Replace current user state with useAuth hook
  const { user, isAuthenticated, signIn, signUp, signOut } = useAuth()
  
  // Add location hook
  const { 
    lastUsedLocation, 
    loadLastUsed, 
    saveLocation,
    detectLocation,
    reverseGeocode 
  } = useLocation()

  // Auto-load last location when user is authenticated
  useEffect(() => {
    if (user?.id) {
      loadLastUsed(user.id)
    }
  }, [user, loadLastUsed])

  // Auto-fill location when loaded
  useEffect(() => {
    if (lastUsedLocation) {
      setDeliveryLocation({
        latitude: lastUsedLocation.latitude,
        longitude: lastUsedLocation.longitude,
        address: lastUsedLocation.addressLine1,
        method: 'manual',
        timestamp: new Date().toISOString()
      })
    }
  }, [lastUsedLocation])

  // Update handleLogin to use new auth service
  const handleLogin = async () => {
    const { success, error } = await signIn(
      customerInfo.email,
      customerInfo.password
    )
    
    if (error) {
      setAuthError(error)
      return
    }
    
    // User is now authenticated
    setAuthStep('authenticated')
  }

  // Update handleSignup to use new auth service
  const handleSignup = async () => {
    const { success, error } = await signUp(
      customerInfo.email,
      customerInfo.password,
      {
        full_name: customerInfo.name,
        phone: customerInfo.phone
      }
    )
    
    if (error) {
      setAuthError(error)
      return
    }
    
    // User is now authenticated
    setAuthStep('authenticated')
  }

  // Update handleSubmitOrder to save location
  const handleSubmitOrder = async () => {
    // ... existing validation ...

    // Save location for future use
    if (user && deliveryLocation) {
      try {
        await saveLocation(user.id, {
          addressLine1: deliveryLocation.address || 'Current location',
          latitude: deliveryLocation.latitude,
          longitude: deliveryLocation.longitude,
          isPrimary: false
        })
      } catch (error) {
        console.warn('Failed to save location:', error)
      }
    }

    // ... rest of order submission ...
  }

  // Rest of component remains the same
}
```

### Step 2: Add Detect Location Button

Add a button to detect GPS location:

```typescript
<Button
  onClick={async () => {
    const coords = await detectLocation()
    if (coords) {
      // Try to get address
      const address = await reverseGeocode(coords.latitude, coords.longitude)
      
      setDeliveryLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address || 'Detected location',
        method: 'gps',
        accuracy: coords.accuracy,
        timestamp: new Date().toISOString()
      })
    }
  }}
  className="btn-pink-primary"
>
  📍 Detect My Location
</Button>
```

### Step 3: Add Offline Indicator

**File**: `src/components/layout/header.tsx` or create new component

```typescript
import { useOffline } from '@/hooks/use-offline'

export function OfflineIndicator() {
  const { isOnline, pendingOrders, syncInProgress } = useOffline()

  if (isOnline && pendingOrders === 0) {
    return null
  }

  return (
    <div className={`px-4 py-2 text-sm text-center ${
      isOnline ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
    }`}>
      {!isOnline && (
        <span>⚠️ You're offline. Orders will sync when connection is restored.</span>
      )}
      {isOnline && pendingOrders > 0 && (
        <span>
          {syncInProgress ? (
            <>🔄 Syncing {pendingOrders} order(s)...</>
          ) : (
            <>📤 {pendingOrders} order(s) pending sync</>
          )}
        </span>
      )}
    </div>
  )
}
```

### Step 4: Add Pending Orders List

**File**: `src/components/pending-orders-list.tsx` (create new)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useOffline } from '@/hooks/use-offline'
import { offlineUtils } from '@/lib/offline-db'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PendingOrdersList() {
  const { pendingOrders, syncInProgress, forceSyncOrders } = useOffline()
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    loadPendingOrders()
  }, [pendingOrders])

  const loadPendingOrders = async () => {
    const unsyncedOrders = await offlineUtils.getUnsyncedOrders()
    setOrders(unsyncedOrders)
  }

  const handleSyncNow = async () => {
    try {
      const result = await forceSyncOrders()
      console.log(`Synced ${result.success} orders, ${result.failed} failed`)
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  if (orders.length === 0) {
    return null
  }

  return (
    <Card className="card-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pending Orders ({orders.length})</span>
          <Button
            onClick={handleSyncNow}
            disabled={syncInProgress}
            size="sm"
            className="btn-pink-primary"
          >
            {syncInProgress ? 'Syncing...' : 'Sync Now'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-dark">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-text">
                    {order.items.length} item(s) • {formatPrice(order.total_amount)}
                  </p>
                </div>
                <span className="badge-yellow">Pending</span>
              </div>
              {order.sync_error && (
                <p className="text-xs text-red-600 mt-2">
                  Error: {order.sync_error}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 5: Add to Dashboard or Settings Page

**File**: `src/app/dashboard/page.tsx` or `src/app/settings/page.tsx`

```typescript
import { PendingOrdersList } from '@/components/pending-orders-list'
import { OfflineIndicator } from '@/components/offline-indicator'

export default function DashboardPage() {
  return (
    <div>
      <OfflineIndicator />
      
      {/* Other dashboard content */}
      
      <PendingOrdersList />
    </div>
  )
}
```

---

## 🧪 Testing the Implementation

### Test 1: Persistent Authentication
1. Open the app in browser
2. Log in with credentials
3. Refresh the page → Should remain logged in
4. Open DevTools → Network tab → Go offline
5. Refresh the page → Should STILL be logged in ✅
6. Try to place an order → Should work without login prompt ✅

### Test 2: Location Auto-fill
1. Log in and go to order page
2. Enter a delivery address
3. Place an order
4. Go back to order page
5. Address should auto-fill ✅
6. Go offline and refresh
7. Address should still auto-fill from cache ✅

### Test 3: Offline Order Placement
1. Log in while online
2. Go offline (DevTools Network tab)
3. Add items to cart
4. Go to checkout
5. Place order → Should save with "Pending" status ✅
6. Check pending orders list → Should show 1 order ✅
7. Go back online
8. Order should auto-sync within 30 seconds ✅
9. Check Supabase → Order should be in database ✅

### Test 4: GPS Location Detection
1. Go to order page
2. Click "Detect My Location"
3. Allow location permission
4. Coordinates should be captured ✅
5. If online, address should be reverse geocoded ✅
6. Go offline and try again
7. Coordinates should still work (no address) ✅

---

## 📊 Verification Checklist

### Backend (✅ Complete)
- [x] Auth service implemented
- [x] Location service implemented
- [x] Offline database enhanced
- [x] Sync service updated
- [x] React hooks created
- [x] Database schema updated
- [x] TypeScript types defined
- [x] Build successful (no errors)

### Frontend (⏳ Pending)
- [ ] Order page updated with new hooks
- [ ] Offline indicator added
- [ ] Pending orders list created
- [ ] Detect location button added
- [ ] Sync status displayed
- [ ] Testing completed

---

## 🎓 Usage Examples

### Example 1: Check if User is Authenticated

```typescript
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  
  if (!isAuthenticated) {
    return <div>Please log in</div>
  }

  return <div>Welcome, {user?.name}!</div>
}
```

### Example 2: Load and Display Last Location

```typescript
import { useLocation } from '@/hooks/use-location'
import { useAuth } from '@/hooks/use-auth'

function LocationDisplay() {
  const { user } = useAuth()
  const { lastUsedLocation, loadLastUsed, loading } = useLocation()

  useEffect(() => {
    if (user) {
      loadLastUsed(user.id)
    }
  }, [user])

  if (loading) return <div>Loading location...</div>

  return (
    <div>
      {lastUsedLocation ? (
        <p>Last used: {lastUsedLocation.addressLine1}</p>
      ) : (
        <p>No saved location</p>
      )}
    </div>
  )
}
```

### Example 3: Detect and Save Location

```typescript
import { useLocation } from '@/hooks/use-location'
import { useAuth } from '@/hooks/use-auth'

function LocationDetector() {
  const { user } = useAuth()
  const { detectLocation, reverseGeocode, saveLocation } = useLocation()

  const handleDetect = async () => {
    const coords = await detectLocation()
    if (!coords) {
      alert('Location detection failed')
      return
    }

    const address = await reverseGeocode(coords.latitude, coords.longitude)

    await saveLocation(user.id, {
      addressLine1: address || 'Detected location',
      latitude: coords.latitude,
      longitude: coords.longitude,
      isPrimary: false
    })

    alert('Location saved!')
  }

  return <button onClick={handleDetect}>Detect Location</button>
}
```

---

## 📚 Documentation

**Complete Documentation**: See `docs/OFFLINE_ORDERING_SYSTEM.md`

**Includes**:
- Detailed architecture
- Complete API reference
- Advanced usage examples
- Troubleshooting guide
- Performance optimization tips
- Security best practices

---

## 🆘 Troubleshooting

### Issue: User still prompted to login when offline

**Check**:
```typescript
import { sessionManager } from '@/lib/offline-db'

// In browser console
const session = await sessionManager.getSession()
console.log('Session:', session)
```

**Solution**: Ensure session is being saved on login

### Issue: Location not auto-filling

**Check**:
```typescript
import { locationManager } from '@/lib/offline-db'

// In browser console
const location = await locationManager.getLastUsedLocation('user-id')
console.log('Location:', location)
```

**Solution**: Verify location is being saved after order placement

### Issue: Orders not syncing

**Check**:
```typescript
import { syncService } from '@/lib/sync-service'

// In browser console
const status = await syncService.getSyncStatus()
console.log('Sync status:', status)
```

**Solution**: Check network connectivity and server reachability

---

## ✅ Summary

**Backend Status**: ✅ Complete and Production-Ready
**Build Status**: ✅ Successful (no TypeScript errors)
**Database**: ✅ Schema ready for deployment
**Documentation**: ✅ Complete with examples

**Next Action**: Integrate the new hooks into UI components following the steps above.

Once UI integration is complete, the offline ordering system will be fully functional with:
- Persistent authentication
- Automatic location management
- Offline order queue
- Automatic sync when online
- GPS detection
- Manual address entry
- Pending orders tracking

---

**Need Help?** Check the complete documentation in `docs/OFFLINE_ORDERING_SYSTEM.md`
