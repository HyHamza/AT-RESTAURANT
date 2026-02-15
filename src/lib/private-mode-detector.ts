/**
 * Utility to detect if the browser is running in private/incognito mode
 * This is important for Edge InPrivate which has strict storage limitations
 */

export async function isPrivateMode(): Promise<boolean> {
  // Quick check for known private mode indicators
  if (typeof window === 'undefined') {
    return false
  }

  try {
    // Test 1: IndexedDB availability
    if (!window.indexedDB) {
      return true
    }

    // Test 2: Try to open a test database
    const testDBName = '__private_mode_test__'
    const testDB = indexedDB.open(testDBName)
    
    const dbResult = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(true) // Timeout suggests private mode
      }, 100)

      testDB.onsuccess = () => {
        clearTimeout(timeout)
        indexedDB.deleteDatabase(testDBName)
        resolve(false)
      }

      testDB.onerror = () => {
        clearTimeout(timeout)
        resolve(true)
      }
    })

    if (dbResult) {
      return true
    }

    // Test 3: localStorage availability
    try {
      const testKey = '__private_mode_test__'
      localStorage.setItem(testKey, '1')
      localStorage.removeItem(testKey)
    } catch {
      return true
    }

    // Test 4: CacheStorage availability (critical for Edge InPrivate)
    if ('caches' in window) {
      try {
        const testCacheName = '__private_mode_test__'
        await caches.open(testCacheName)
        await caches.delete(testCacheName)
      } catch {
        return true
      }
    }

    // Test 5: Check storage estimate (private mode often has very low quotas)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        // Private mode typically has very low quota (< 10MB)
        if (estimate.quota && estimate.quota < 10 * 1024 * 1024) {
          return true
        }
      } catch {
        // Ignore errors
      }
    }

    return false
  } catch {
    // If any test throws, assume private mode for safety
    return true
  }
}

/**
 * Check if storage APIs are available and functional
 */
export async function checkStorageAvailability(): Promise<{
  indexedDB: boolean
  localStorage: boolean
  cacheStorage: boolean
  isPrivate: boolean
}> {
  const result = {
    indexedDB: false,
    localStorage: false,
    cacheStorage: false,
    isPrivate: false
  }

  if (typeof window === 'undefined') {
    return result
  }

  // Check IndexedDB
  try {
    if (window.indexedDB) {
      const testDB = indexedDB.open('__test__')
      await new Promise((resolve, reject) => {
        testDB.onsuccess = resolve
        testDB.onerror = reject
        setTimeout(() => reject(new Error('timeout')), 100)
      })
      indexedDB.deleteDatabase('__test__')
      result.indexedDB = true
    }
  } catch {
    result.indexedDB = false
  }

  // Check localStorage
  try {
    localStorage.setItem('__test__', '1')
    localStorage.removeItem('__test__')
    result.localStorage = true
  } catch {
    result.localStorage = false
  }

  // Check CacheStorage
  try {
    if ('caches' in window) {
      await caches.open('__test__')
      await caches.delete('__test__')
      result.cacheStorage = true
    }
  } catch {
    result.cacheStorage = false
  }

  // Determine if in private mode
  result.isPrivate = !result.indexedDB || !result.localStorage || !result.cacheStorage

  return result
}

/**
 * Get a user-friendly message about storage limitations
 */
export function getStorageLimitationMessage(isPrivate: boolean): string | null {
  if (!isPrivate) {
    return null
  }

  return 'You are browsing in private mode. Some offline features may be limited or unavailable.'
}
