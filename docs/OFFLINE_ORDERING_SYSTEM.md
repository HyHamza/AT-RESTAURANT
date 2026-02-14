# Complete Offline Ordering System Documentation

## Overview

The AT Restaurant PWA now features a complete offline ordering system that allows users to:
- Stay authenticated while offline
- Place orders without internet connection
- Automatically save and retrieve delivery locations
- Queue orders for automatic submission when back online
- Seamless transition between online and offline modes

---

## Architecture

### 1. Persistent User Authentication

#### Session Storage
- **IndexedDB**: Primary storage for user sessions
- **localStorage**: Backup storage for redundancy
- **Session Duration**: 24 hours of inactivity

#### Session Data Structure
```typescript
interface UserSession {
  userId: string
  email: string
  name: string | null
  phone: string | null
  authToken: string | null
  loginTime: number
  isOfflineAuth: boolean
  lastActivity: number
}
```

#### How It Works
1. User logs in while online → Session saved to IndexedDB + localStorage
2. User goes offline → Session retrieved from cache
3. User remains authenticated without re-login prompt
4. Session auto-expires after 24 hours of inactivity
5. Activity updates extend session lifetime

---

### 2. Automatic Location Management

#### Database Schema

**Online Storage** (`user_locations` table):
```sql
CREATE TABLE user_locations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_primary BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**Offline Storage** (IndexedDB):
```typescript
interface SavedLocation {
  id: string
  userId: string
  addressLine1: string
  addressLine2?: string | null
  city?: string | null
  postalCode?: string | null
  latitude: number
  longitude: number
  isPrimary: boolean
  lastUsedAt: number
  createdAt: number
}
```

#### Location Features

**Auto-fill on Order Page**:
- Automatically loads last used location
- Shows visual indicator for auto-filled addresses
- Works offline using cached data

**Location Detection**:
- GPS-based location detection (works offline)
- Reverse geocoding when online
- Manual address entry always available
- Coordinates saved even if address unavailable

**Multiple Addresses**:
- Store unlimited delivery addresses
- Mark one as primary/default
- Quick select from saved locations
- Edit/delete saved addresses

---

### 3. Offline Order Queue System

#### Order Storage Structure

```typescript
interface OfflineOrder {
  id: string
  user_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  total_amount: number
  original_amount?: number
  discount_amount?: number
  discount_percentage?: number
  pwa_discount_applied?: boolean
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  notes?: string | null
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  delivery_address?: string | null
  location_method?: 'gps' | 'manual' | 'none'
  items: Array<{
    menu_item_id: string
    quantity: number
    unit_price: number
    total_price: number
    item_name: string
  }>
  created_at: string
  synced: 0 | 1
  sync_attempts?: number
  last_sync_attempt?: string
  sync_error?: string
}
```

#### Sync Mechanism

**Automatic Sync Triggers**:
1. Network comes back online (online event)
2. Periodic check every 30 seconds
3. Background Sync API (when supported)
4. Manual sync button

**Sync Process**:
1. Check network connectivity
2. Verify server reachability
3. Get all unsynced orders from IndexedDB
4. Sort by creation date (oldest first)
5. Submit each order to Supabase
6. Mark as synced on success
7. Retry with exponential backoff on failure

**Retry Logic**:
- Maximum 5 retry attempts per order
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Failed orders remain in queue
- Manual retry option available

---

## Implementation Guide

### Step 1: Database Setup

Run the enhanced schema in Supabase SQL Editor:

```sql
-- The schema.sql file includes:
-- 1. user_locations table
-- 2. Enhanced orders table with location fields
-- 3. PWA discount fields
-- 4. Indexes for performance
-- 5. Triggers for timestamps
```

### Step 2: Client-Side Integration

#### Initialize Auth Service

```typescript
import { authService } from '@/lib/auth-service'

// In your app initialization
await authService.initialize()

// Subscribe to auth changes
authService.onAuthStateChange((user) => {
  console.log('Auth state changed:', user)
})
```

#### Use Auth Hook in Components

```typescript
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { user, loading, isAuthenticated, signIn, signOut } = useAuth()

  if (loading) return <div>Loading...</div>
  
  if (!isAuthenticated) {
    return <LoginForm onSubmit={signIn} />
  }

  return <div>Welcome, {user?.name}!</div>
}
```

#### Use Location Hook

```typescript
import { useLocation } from '@/hooks/use-location'

function OrderPage() {
  const { user } = useAuth()
  const { 
    lastUsedLocation, 
    loadLastUsed, 
    saveLocation,
    detectLocation 
  } = useLocation()

  useEffect(() => {
    if (user) {
      loadLastUsed(user.id)
    }
  }, [user])

  const handleDetectLocation = async () => {
    const coords = await detectLocation()
    if (coords) {
      // Save location
      await saveLocation(user.id, {
        addressLine1: 'Detected location',
        latitude: coords.latitude,
        longitude: coords.longitude
      })
    }
  }

  return (
    <div>
      {lastUsedLocation && (
        <div>Last used: {lastUsedLocation.addressLine1}</div>
      )}
      <button onClick={handleDetectLocation}>Detect Location</button>
    </div>
  )
}
```

### Step 3: Order Placement (Offline-Ready)

```typescript
import { offlineUtils } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'

async function placeOrder(orderData) {
  // Always store offline first
  await offlineUtils.storeOfflineOrder({
    ...orderData,
    created_at: new Date().toISOString(),
    synced: 0
  })

  // Try to submit online if possible
  if (navigator.onLine) {
    try {
      await supabase.from('orders').insert(orderData)
      await offlineUtils.markOrderSynced(orderData.id)
    } catch (error) {
      // Order will be synced later
      console.log('Order saved offline, will sync when online')
    }
  }
}
```

### Step 4: Monitor Sync Status

```typescript
import { useOffline } from '@/hooks/use-offline'

function SyncStatus() {
  const { 
    isOnline, 
    pendingOrders, 
    syncInProgress,
    forceSyncOrders 
  } = useOffline()

  return (
    <div>
      <div>Status: {isOnline ? 'Online' : 'Offline'}</div>
      <div>Pending Orders: {pendingOrders}</div>
      {syncInProgress && <div>Syncing...</div>}
      <button onClick={forceSyncOrders}>Sync Now</button>
    </div>
  )
}
```

---

## User Experience Flow

### Scenario 1: User Places Order While Online

1. User logs in → Session saved to IndexedDB
2. User browses menu → Items cached
3. User adds items to cart → Cart in localStorage
4. User goes to checkout → Last location auto-filled
5. User places order → Saved to IndexedDB + Supabase
6. Order confirmed immediately

### Scenario 2: User Places Order While Offline

1. User was logged in earlier → Session restored from IndexedDB
2. User browses menu → Loads from cache
3. User adds items to cart → Cart in localStorage
4. User goes to checkout → Last location auto-filled from cache
5. User places order → Saved to IndexedDB only
6. Order shows "Pending Sync" badge
7. User comes back online → Order auto-syncs
8. User receives confirmation notification

### Scenario 3: User Switches Between Online/Offline

1. User online → Normal operation
2. Connection lost → Seamless switch to offline mode
3. User continues browsing → Cached data
4. User places order → Queued for sync
5. Connection restored → Auto-sync triggered
6. All pending orders submitted
7. User notified of successful sync

---

## API Reference

### Auth Service

```typescript
// Initialize
await authService.initialize()

// Sign in
const { user, error } = await authService.signIn(email, password)

// Sign up
const { user, error } = await authService.signUp(email, password, {
  full_name: 'John Doe',
  phone: '+1234567890'
})

// Sign out
await authService.signOut()

// Get current user
const user = authService.getCurrentUser()

// Check authentication
const isAuth = await authService.isAuthenticated()

// Update activity
await authService.updateActivity()

// Subscribe to changes
const unsubscribe = authService.onAuthStateChange((user) => {
  console.log('User:', user)
})
```

### Location Service

```typescript
// Get last used location
const location = await locationService.getLastUsedLocation(userId)

// Get all user locations
const locations = await locationService.getUserLocations(userId)

// Save new location
const locationId = await locationService.saveLocation(userId, {
  addressLine1: '123 Main St',
  city: 'New York',
  latitude: 40.7128,
  longitude: -74.0060
})

// Update last used
await locationService.updateLastUsed(userId, locationId)

// Set as primary
await locationService.setPrimary(userId, locationId)

// Delete location
await locationService.deleteLocation(userId, locationId)

// Detect GPS location
const coords = await locationService.detectLocation()

// Reverse geocode
const address = await locationService.reverseGeocode(lat, lng)
```

### Offline Utils

```typescript
// Store order offline
await offlineUtils.storeOfflineOrder(order)

// Get unsynced orders
const orders = await offlineUtils.getUnsyncedOrders()

// Mark order synced
await offlineUtils.markOrderSynced(orderId)

// Get cache stats
const stats = await offlineUtils.getCacheStats()
```

### Session Manager

```typescript
// Save session
await sessionManager.saveSession({
  userId: 'user-id',
  email: 'user@example.com',
  name: 'John Doe',
  phone: '+1234567890',
  authToken: null,
  loginTime: Date.now(),
  isOfflineAuth: false
})

// Get session
const session = await sessionManager.getSession()

// Update activity
await sessionManager.updateActivity()

// Clear session
await sessionManager.clearSession()

// Check authentication
const isAuth = await sessionManager.isAuthenticated()
```

### Location Manager

```typescript
// Save location
const locationId = await locationManager.saveLocation({
  userId: 'user-id',
  addressLine1: '123 Main St',
  latitude: 40.7128,
  longitude: -74.0060,
  isPrimary: true,
  lastUsedAt: Date.now()
})

// Get last used
const location = await locationManager.getLastUsedLocation(userId)

// Get all locations
const locations = await locationManager.getUserLocations(userId)

// Update last used
await locationManager.updateLastUsed(locationId)

// Set primary
await locationManager.setPrimary(locationId, userId)

// Delete location
await locationManager.deleteLocation(locationId)
```

---

## Testing Checklist

### Authentication Tests
- [ ] User can log in while online
- [ ] Session persists after page refresh
- [ ] User remains logged in when going offline
- [ ] No login prompt when offline with valid session
- [ ] Session expires after 24 hours
- [ ] Activity updates extend session
- [ ] User can log out (online and offline)

### Location Tests
- [ ] Last used location auto-fills on order page
- [ ] GPS detection works offline
- [ ] Manual address entry always available
- [ ] Multiple addresses can be saved
- [ ] Primary address is marked correctly
- [ ] Locations sync between online/offline
- [ ] Reverse geocoding works when online

### Order Queue Tests
- [ ] Orders can be placed offline
- [ ] Orders are stored in IndexedDB
- [ ] Pending orders show correct badge
- [ ] Orders auto-sync when online
- [ ] Failed orders retry with backoff
- [ ] Manual sync button works
- [ ] Sync status updates in real-time
- [ ] Duplicate orders are prevented

### Edge Cases
- [ ] Browser data cleared → Prompts for login
- [ ] Multiple devices → Orders sync from all
- [ ] Partial network failure → Retries work
- [ ] Location permission denied → Manual entry works
- [ ] Session expired → Prompts for re-login
- [ ] IndexedDB unavailable → Graceful fallback

---

## Troubleshooting

### Issue: User prompted to login when offline

**Solution**: Check if session is being saved correctly
```typescript
const session = await sessionManager.getSession()
console.log('Session:', session)
```

### Issue: Location not auto-filling

**Solution**: Verify location is being saved
```typescript
const location = await locationManager.getLastUsedLocation(userId)
console.log('Last location:', location)
```

### Issue: Orders not syncing

**Solution**: Check sync service status
```typescript
const status = await syncService.getSyncStatus()
console.log('Sync status:', status)
```

### Issue: IndexedDB not working

**Solution**: Check if private mode is enabled
```typescript
// The system automatically falls back to localStorage
// Check browser console for warnings
```

---

## Performance Considerations

### IndexedDB Size Limits
- Chrome: ~60% of available disk space
- Firefox: ~50% of available disk space
- Safari: ~1GB

### Optimization Tips
1. Clear expired cached assets regularly
2. Limit number of saved locations per user
3. Remove synced orders after 30 days
4. Compress large data before storing
5. Use indexes for faster queries

---

## Security Considerations

### Session Security
- Auth tokens are NOT stored (security risk)
- Sessions expire after 24 hours
- Activity tracking prevents stale sessions
- Logout clears all cached data

### Data Privacy
- User data encrypted in transit (HTTPS)
- IndexedDB data is origin-specific
- No sensitive data in localStorage
- Clear data on logout

---

## Future Enhancements

1. **Conflict Resolution**: Handle order conflicts when syncing from multiple devices
2. **Partial Sync**: Sync individual order items if full order fails
3. **Compression**: Compress order data before storing
4. **Encryption**: Encrypt sensitive data in IndexedDB
5. **Analytics**: Track offline usage patterns
6. **Push Notifications**: Notify users when orders sync successfully

---

## Support

For issues or questions:
- Check browser console for detailed error logs
- Verify IndexedDB is enabled in browser settings
- Ensure service worker is registered correctly
- Test in incognito mode to rule out extension conflicts

---

**Status**: ✅ Fully Implemented
**Version**: 2.0
**Last Updated**: 2026-02-14
