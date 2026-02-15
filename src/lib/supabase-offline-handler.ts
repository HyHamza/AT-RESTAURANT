/**
 * Supabase Offline Handler
 * Intercepts Supabase requests when offline to prevent errors
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Track offline state
let isOffline = false

if (typeof window !== 'undefined') {
  isOffline = !navigator.onLine
  
  window.addEventListener('online', () => {
    isOffline = false
    console.log('[Supabase Offline] Back online')
  })
  
  window.addEventListener('offline', () => {
    isOffline = true
    console.log('[Supabase Offline] Gone offline')
  })
}

/**
 * Wrap Supabase client to handle offline gracefully
 */
export function createOfflineAwareSupabase(client: SupabaseClient) {
  // Store original methods
  const originalFrom = client.from.bind(client)
  const originalAuth = client.auth

  // Override from() to check offline state
  client.from = function(table: string) {
    const query = originalFrom(table)
    
    // Wrap query methods
    const originalSelect = query.select.bind(query)
    const originalInsert = query.insert.bind(query)
    const originalUpdate = query.update.bind(query)
    const originalDelete = query.delete.bind(query)

    query.select = function(this: any, ...args: any[]) {
      if (isOffline) {
        console.log('[Supabase Offline] Blocking SELECT query (offline):', table)
        return Promise.resolve({
          data: null,
          error: {
            message: 'Offline - data unavailable',
            code: 'OFFLINE',
            details: 'No internet connection',
            hint: 'Check your connection and try again'
          },
          count: null,
          status: 503,
          statusText: 'Service Unavailable'
        }) as any
      }
      return originalSelect.apply(this, args as [any])
    }

    query.insert = function(this: any, ...args: any[]) {
      if (isOffline) {
        console.log('[Supabase Offline] Blocking INSERT query (offline):', table)
        return Promise.resolve({
          data: null,
          error: {
            message: 'Offline - cannot insert data',
            code: 'OFFLINE',
            details: 'No internet connection',
            hint: 'Data will be synced when online'
          },
          count: null,
          status: 503,
          statusText: 'Service Unavailable'
        }) as any
      }
      return originalInsert.apply(this, args as [any])
    }

    query.update = function(this: any, ...args: any[]) {
      if (isOffline) {
        console.log('[Supabase Offline] Blocking UPDATE query (offline):', table)
        return Promise.resolve({
          data: null,
          error: {
            message: 'Offline - cannot update data',
            code: 'OFFLINE',
            details: 'No internet connection',
            hint: 'Changes will be synced when online'
          },
          count: null,
          status: 503,
          statusText: 'Service Unavailable'
        }) as any
      }
      return originalUpdate.apply(this, args as [any])
    }

    query.delete = function(this: any, ...args: any[]) {
      if (isOffline) {
        console.log('[Supabase Offline] Blocking DELETE query (offline):', table)
        return Promise.resolve({
          data: null,
          error: {
            message: 'Offline - cannot delete data',
            code: 'OFFLINE',
            details: 'No internet connection',
            hint: 'Changes will be synced when online'
          },
          count: null,
          status: 503,
          statusText: 'Service Unavailable'
        }) as any
      }
      return originalDelete.apply(this, args as [any])
    }

    return query
  }

  // Override auth methods to handle offline
  const originalGetSession = originalAuth.getSession.bind(originalAuth)
  const originalGetUser = originalAuth.getUser.bind(originalAuth)
  const originalSignIn = originalAuth.signInWithPassword.bind(originalAuth)
  const originalSignUp = originalAuth.signUp.bind(originalAuth)
  const originalSignOut = originalAuth.signOut.bind(originalAuth)

  client.auth.getSession = async function() {
    if (isOffline) {
      console.log('[Supabase Offline] Blocking getSession (offline)')
      
      // Try to return cached session from localStorage
      try {
        const cachedSession = localStorage.getItem('supabase.auth.token')
        if (cachedSession) {
          const session = JSON.parse(cachedSession)
          return {
            data: { session },
            error: null
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
      
      return {
        data: { session: null },
        error: {
          message: 'Offline - session unavailable',
          name: 'OFFLINE',
          status: 503
        } as any
      }
    }
    return originalGetSession()
  }

  client.auth.getUser = async function() {
    if (isOffline) {
      console.log('[Supabase Offline] Blocking getUser (offline)')
      
      // Try to return cached user from localStorage
      try {
        const cachedSession = localStorage.getItem('supabase.auth.token')
        if (cachedSession) {
          const session = JSON.parse(cachedSession)
          return {
            data: { user: session.user || null },
            error: null
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
      
      return {
        data: { user: null },
        error: {
          message: 'Offline - user unavailable',
          name: 'OFFLINE',
          status: 503
        } as any
      }
    }
    return originalGetUser()
  }

  client.auth.signInWithPassword = async function(credentials: any) {
    if (isOffline) {
      console.log('[Supabase Offline] Blocking signIn (offline)')
      return {
        data: { user: null, session: null },
        error: {
          message: 'Cannot sign in while offline',
          name: 'OFFLINE',
          status: 503
        } as any
      }
    }
    return originalSignIn(credentials)
  }

  client.auth.signUp = async function(credentials: any) {
    if (isOffline) {
      console.log('[Supabase Offline] Blocking signUp (offline)')
      return {
        data: { user: null, session: null },
        error: {
          message: 'Cannot sign up while offline',
          name: 'OFFLINE',
          status: 503
        } as any
      }
    }
    return originalSignUp(credentials)
  }

  client.auth.signOut = async function() {
    if (isOffline) {
      console.log('[Supabase Offline] Blocking signOut (offline)')
      // Allow sign out offline by clearing local storage
      try {
        localStorage.removeItem('supabase.auth.token')
      } catch (e) {
        // Ignore
      }
      return { error: null }
    }
    return originalSignOut()
  }

  return client
}

/**
 * Check if currently offline
 */
export function checkOffline(): boolean {
  return isOffline
}

/**
 * Wait for online connection
 */
export function waitForOnline(timeout = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isOffline) {
      resolve(true)
      return
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler)
      resolve(false)
    }, timeout)

    const onlineHandler = () => {
      clearTimeout(timeoutId)
      window.removeEventListener('online', onlineHandler)
      resolve(true)
    }

    window.addEventListener('online', onlineHandler)
  })
}
