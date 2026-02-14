/**
 * React Hook for Authentication with Offline Support
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { authService, type AuthUser } from '@/lib/auth-service'

interface UseAuthReturn {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>
  signUp: (email: string, password: string, metadata: { full_name: string; phone: string }) => Promise<{ success: boolean; error: string | null }>
  signOut: () => Promise<void>
  updateActivity: () => Promise<void>
  syncSession: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth on mount
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const currentUser = await authService.initialize()
        if (mounted) {
          setUser(currentUser)
        }
      } catch (error) {
        console.error('[useAuth] Initialization failed:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((newUser) => {
      if (mounted) {
        setUser(newUser)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { user: authUser, error } = await authService.signIn(email, password)
      
      if (error) {
        return { success: false, error }
      }

      setUser(authUser)
      return { success: true, error: null }
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign in failed' }
    }
  }, [])

  // Sign up
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    metadata: { full_name: string; phone: string }
  ) => {
    try {
      const { user: authUser, error } = await authService.signUp(email, password, metadata)
      
      if (error) {
        return { success: false, error }
      }

      if (authUser) {
        setUser(authUser)
      }
      
      return { success: true, error: null }
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign up failed' }
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
      setUser(null)
    } catch (error) {
      console.error('[useAuth] Sign out failed:', error)
      throw error
    }
  }, [])

  // Update activity
  const updateActivity = useCallback(async () => {
    try {
      await authService.updateActivity()
    } catch (error) {
      console.error('[useAuth] Update activity failed:', error)
    }
  }, [])

  // Sync session
  const syncSession = useCallback(async () => {
    try {
      await authService.syncSession()
    } catch (error) {
      console.error('[useAuth] Session sync failed:', error)
    }
  }, [])

  return {
    user,
    loading,
    isAuthenticated: user !== null,
    signIn,
    signUp,
    signOut,
    updateActivity,
    syncSession
  }
}
