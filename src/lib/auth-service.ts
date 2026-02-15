/**
 * Enhanced Authentication Service with Offline Support
 * Handles user authentication with persistent session management
 */

import { supabase } from './supabase'
import { sessionManager, locationManager, type UserSession } from './offline-db'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  phone: string | null
  isOffline: boolean
}

export class AuthService {
  private static instance: AuthService
  private currentUser: AuthUser | null = null
  private authListeners: Set<(user: AuthUser | null) => void> = new Set()

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Initialize auth service and restore session
   */
  async initialize(): Promise<AuthUser | null> {
    try {
      // Try to get online session first
      if (navigator.onLine) {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const authUser = await this.createAuthUser(session.user, false)
          this.currentUser = authUser
          
          // Save session for offline use
          await this.saveSessionOffline(session.user)
          
          this.notifyListeners(authUser)
          return authUser
        }
      }
      
      // Fallback to offline session
      const offlineSession = await sessionManager.getSession()
      if (offlineSession) {
        const authUser: AuthUser = {
          id: offlineSession.userId,
          email: offlineSession.email,
          name: offlineSession.name,
          phone: offlineSession.phone,
          isOffline: true
        }
        
        this.currentUser = authUser
        this.notifyListeners(authUser)
        return authUser
      }
      
      return null
    } catch (error) {
      console.error('[AuthService] Initialization failed:', error)
      
      // Try offline session as last resort
      const offlineSession = await sessionManager.getSession()
      if (offlineSession) {
        const authUser: AuthUser = {
          id: offlineSession.userId,
          email: offlineSession.email,
          name: offlineSession.name,
          phone: offlineSession.phone,
          isOffline: true
        }
        
        this.currentUser = authUser
        this.notifyListeners(authUser)
        return authUser
      }
      
      return null
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        const authUser = await this.createAuthUser(data.user, false)
        this.currentUser = authUser
        
        // Save session for offline use
        await this.saveSessionOffline(data.user)
        
        this.notifyListeners(authUser)
        return { user: authUser, error: null }
      }

      return { user: null, error: 'Login failed' }
    } catch (error: any) {
      console.error('[AuthService] Sign in failed:', error)
      return { user: null, error: error.message || 'Login failed' }
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string, 
    password: string, 
    metadata: { full_name: string; phone: string }
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        // Create user record in users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: metadata.full_name,
            phone: metadata.phone
          })

        if (userError) {
          console.warn('[AuthService] Failed to create user record:', userError)
        }

        // If immediately confirmed (no email verification)
        if (data.session) {
          const authUser = await this.createAuthUser(data.user, false)
          this.currentUser = authUser
          
          // Save session for offline use
          await this.saveSessionOffline(data.user)
          
          this.notifyListeners(authUser)
          return { user: authUser, error: null }
        }

        return { user: null, error: 'Please check your email to confirm your account' }
      }

      return { user: null, error: 'Sign up failed' }
    } catch (error: any) {
      console.error('[AuthService] Sign up failed:', error)
      return { user: null, error: error.message || 'Sign up failed' }
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      if (navigator.onLine) {
        await supabase.auth.signOut()
      }
      
      // Clear offline session
      await sessionManager.clearSession()
      
      this.currentUser = null
      this.notifyListeners(null)
    } catch (error) {
      console.error('[AuthService] Sign out failed:', error)
      throw error
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser
  }

  /**
   * Check if user is authenticated (online or offline)
   */
  async isAuthenticated(): Promise<boolean> {
    if (this.currentUser) {
      return true
    }
    
    // Check offline session
    return await sessionManager.isAuthenticated()
  }

  /**
   * Update user activity timestamp
   */
  async updateActivity(): Promise<void> {
    await sessionManager.updateActivity()
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.authListeners.add(callback)
    
    // Immediately call with current user
    callback(this.currentUser)
    
    // Return unsubscribe function
    return () => {
      this.authListeners.delete(callback)
    }
  }

  /**
   * Create AuthUser from Supabase User
   */
  private async createAuthUser(user: User, isOffline: boolean): Promise<AuthUser> {
    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || null,
      phone: user.user_metadata?.phone || null,
      isOffline
    }
  }

  /**
   * Save session for offline use
   */
  private async saveSessionOffline(user: User): Promise<void> {
    try {
      const session: Omit<UserSession, 'lastActivity'> = {
        userId: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || null,
        phone: user.user_metadata?.phone || null,
        authToken: null, // We don't store tokens for security
        loginTime: Date.now(),
        isOfflineAuth: false
      }
      
      await sessionManager.saveSession(session)
    } catch (error) {
      console.error('[AuthService] Failed to save offline session:', error)
    }
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyListeners(user: AuthUser | null): void {
    this.authListeners.forEach(listener => {
      try {
        listener(user)
      } catch (error) {
        console.error('[AuthService] Listener error:', error)
      }
    })
  }

  /**
   * Sync offline session with online session
   */
  async syncSession(): Promise<void> {
    if (!navigator.onLine) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const authUser = await this.createAuthUser(session.user, false)
        this.currentUser = authUser
        
        // Update offline session
        await this.saveSessionOffline(session.user)
        
        this.notifyListeners(authUser)
      }
    } catch (error) {
      console.error('[AuthService] Session sync failed:', error)
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()
