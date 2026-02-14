'use client'

import { usePWADiscountContext } from '@/contexts/pwa-discount-context'
import { Percent, Sparkles } from 'lucide-react'

interface PWADiscountBadgeProps {
  /**
   * Display variant
   */
  variant?: 'header' | 'inline' | 'floating'
  /**
   * Custom className
   */
  className?: string
}

/**
 * Badge component to indicate active PWA discount
 * Shows in header or other locations to remind users of their discount
 */
export function PWADiscountBadge({ 
  variant = 'header',
  className = '' 
}: PWADiscountBadgeProps) {
  const { isEligible, discountPercentage } = usePWADiscountContext()

  if (!isEligible) {
    return null
  }

  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full text-xs font-semibold shadow-sm ${className}`}>
        <Percent className="h-3 w-3" />
        <span>{discountPercentage}% OFF</span>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium ${className}`}>
        <Sparkles className="h-3 w-3" />
        <span>PWA Discount Active</span>
      </div>
    )
  }

  if (variant === 'floating') {
    return (
      <div className={`fixed top-20 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg shadow-lg text-sm font-semibold ${className}`}>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <Percent className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs opacity-90">Active Discount</span>
          <span className="font-bold">{discountPercentage}% OFF</span>
        </div>
      </div>
    )
  }

  return null
}
