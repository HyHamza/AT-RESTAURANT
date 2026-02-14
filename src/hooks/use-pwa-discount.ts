'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface PWADiscountState {
  isEligible: boolean
  isLoading: boolean
  discountPercentage: number
  activatedAt: Date | null
  error: string | null
}

interface PWADiscountActions {
  activateDiscount: () => Promise<boolean>
  checkEligibility: () => Promise<void>
  calculateDiscount: (amount: number) => {
    originalAmount: number
    discountAmount: number
    finalAmount: number
    savings: number
  }
}

/**
 * Custom hook for managing PWA discount functionality
 * Handles discount eligibility, activation, and price calculations
 */
export function usePWADiscount(): PWADiscountState & PWADiscountActions {
  const [state, setState] = useState<PWADiscountState>({
    isEligible: false,
    isLoading: true,
    discountPercentage: 10,
    activatedAt: null,
    error: null,
  })

  /**
   * Generate a unique session ID for fraud prevention
   */
  const getSessionId = useCallback((): string => {
    let sessionId = localStorage.getItem('pwa-session-id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('pwa-session-id', sessionId)
    }
    return sessionId
  }, [])

  /**
   * Get device information for tracking
   */
  const getDeviceInfo = useCallback((): string => {
    return JSON.stringify({
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }, [])

  /**
   * Check if user is eligible for PWA discount
   */
  const checkEligibility = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // For non-authenticated users, check localStorage
        const localEligibility = localStorage.getItem('pwa-discount-eligible') === 'true'
        setState(prev => ({
          ...prev,
          isEligible: localEligibility,
          isLoading: false,
        }))
        return
      }

      // Check database for authenticated users
      const { data, error } = await supabase
        .from('users')
        .select('pwa_discount_eligible, pwa_discount_activated_at')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setState(prev => ({
        ...prev,
        isEligible: data?.pwa_discount_eligible || false,
        activatedAt: data?.pwa_discount_activated_at ? new Date(data.pwa_discount_activated_at) : null,
        isLoading: false,
      }))

      // Sync with localStorage
      if (data?.pwa_discount_eligible) {
        localStorage.setItem('pwa-discount-eligible', 'true')
      }
    } catch (error) {
      console.error('Error checking PWA discount eligibility:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to check discount eligibility',
        isLoading: false,
      }))
    }
  }, [])

  /**
   * Activate PWA discount for the current user
   */
  const activateDiscount = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const sessionId = getSessionId()
      const deviceInfo = getDeviceInfo()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // For non-authenticated users, store in localStorage
        localStorage.setItem('pwa-discount-eligible', 'true')
        localStorage.setItem('pwa-discount-activated-at', new Date().toISOString())
        
        setState(prev => ({
          ...prev,
          isEligible: true,
          activatedAt: new Date(),
          isLoading: false,
        }))
        
        return true
      }

      // Call database function to activate discount
      const { data, error } = await supabase.rpc('activate_pwa_discount', {
        p_user_id: user.id,
        p_session_id: sessionId,
        p_device_info: deviceInfo,
        p_user_agent: navigator.userAgent,
      })

      if (error) throw error

      const result = data as { success: boolean; message: string; already_activated?: boolean }

      if (result.success || result.already_activated) {
        setState(prev => ({
          ...prev,
          isEligible: true,
          activatedAt: new Date(),
          isLoading: false,
        }))
        
        localStorage.setItem('pwa-discount-eligible', 'true')
        localStorage.setItem('pwa-discount-activated-at', new Date().toISOString())
        
        return true
      } else {
        setState(prev => ({
          ...prev,
          error: result.message,
          isLoading: false,
        }))
        return false
      }
    } catch (error) {
      console.error('Error activating PWA discount:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to activate discount',
        isLoading: false,
      }))
      return false
    }
  }, [getSessionId, getDeviceInfo])

  /**
   * Calculate discount for a given amount
   */
  const calculateDiscount = useCallback((amount: number) => {
    const originalAmount = amount
    const discountAmount = state.isEligible 
      ? Math.round(amount * (state.discountPercentage / 100) * 100) / 100
      : 0
    const finalAmount = originalAmount - discountAmount
    const savings = discountAmount

    return {
      originalAmount,
      discountAmount,
      finalAmount,
      savings,
    }
  }, [state.isEligible, state.discountPercentage])

  // Check eligibility on mount
  useEffect(() => {
    checkEligibility()
  }, [checkEligibility])

  return {
    ...state,
    activateDiscount,
    checkEligibility,
    calculateDiscount,
  }
}
