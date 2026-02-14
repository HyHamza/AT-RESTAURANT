'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { usePWADiscount } from '@/hooks/use-pwa-discount'

interface PWADiscountContextType {
  isEligible: boolean
  isLoading: boolean
  discountPercentage: number
  activatedAt: Date | null
  error: string | null
  activateDiscount: () => Promise<boolean>
  checkEligibility: () => Promise<void>
  calculateDiscount: (amount: number) => {
    originalAmount: number
    discountAmount: number
    finalAmount: number
    savings: number
  }
}

const PWADiscountContext = createContext<PWADiscountContextType | undefined>(undefined)

interface PWADiscountProviderProps {
  children: ReactNode
}

/**
 * Provider component for PWA discount functionality
 * Wraps the app to provide discount state and actions globally
 */
export function PWADiscountProvider({ children }: PWADiscountProviderProps) {
  const discountState = usePWADiscount()

  return (
    <PWADiscountContext.Provider value={discountState}>
      {children}
    </PWADiscountContext.Provider>
  )
}

/**
 * Hook to access PWA discount context
 * Must be used within PWADiscountProvider
 */
export function usePWADiscountContext() {
  const context = useContext(PWADiscountContext)
  if (context === undefined) {
    throw new Error('usePWADiscountContext must be used within a PWADiscountProvider')
  }
  return context
}
