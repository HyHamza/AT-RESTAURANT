'use client'

import { usePWADiscountContext } from '@/contexts/pwa-discount-context'
import { formatPrice } from '@/lib/utils'
import { Percent } from 'lucide-react'

interface PriceDisplayProps {
  /**
   * Original price before discount
   */
  price: number
  /**
   * Display variant
   * - 'default': Shows both original and discounted price
   * - 'compact': Smaller text, suitable for cards
   * - 'large': Larger text, suitable for product details
   */
  variant?: 'default' | 'compact' | 'large'
  /**
   * Show discount badge
   */
  showBadge?: boolean
  /**
   * Custom className for styling
   */
  className?: string
}

/**
 * Component to display prices with PWA discount applied
 * Automatically shows original price with strikethrough and discounted price
 */
export function PriceDisplay({ 
  price, 
  variant = 'default',
  showBadge = false,
  className = '' 
}: PriceDisplayProps) {
  const { isEligible, calculateDiscount } = usePWADiscountContext()

  const { originalAmount, finalAmount, savings } = calculateDiscount(price)

  // Size classes based on variant
  const sizeClasses = {
    compact: {
      original: 'text-xs',
      final: 'text-sm font-semibold',
      badge: 'text-[10px] px-1.5 py-0.5',
    },
    default: {
      original: 'text-sm',
      final: 'text-lg font-bold',
      badge: 'text-xs px-2 py-1',
    },
    large: {
      original: 'text-base',
      final: 'text-2xl font-bold',
      badge: 'text-sm px-3 py-1',
    },
  }

  const sizes = sizeClasses[variant]

  if (!isEligible) {
    // No discount - show regular price
    return (
      <div className={`flex items-center ${className}`}>
        <span className={`${sizes.final} text-gray-900`}>
          {formatPrice(originalAmount)}
        </span>
      </div>
    )
  }

  // Show discounted price
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col">
        <span className={`${sizes.original} text-gray-500 line-through`}>
          {formatPrice(originalAmount)}
        </span>
        <div className="flex items-center gap-2">
          <span className={`${sizes.final} text-orange-600`}>
            {formatPrice(finalAmount)}
          </span>
          {showBadge && (
            <span className={`${sizes.badge} bg-orange-100 text-orange-700 rounded-full font-semibold flex items-center gap-1`}>
              <Percent className="h-3 w-3" />
              -10%
            </span>
          )}
        </div>
      </div>
      {variant !== 'compact' && (
        <span className="text-xs text-green-600 font-medium">
          Save {formatPrice(savings)}
        </span>
      )}
    </div>
  )
}

interface TotalPriceDisplayProps {
  /**
   * Total amount before discount
   */
  total: number
  /**
   * Show detailed breakdown
   */
  showBreakdown?: boolean
  /**
   * Custom className for styling
   */
  className?: string
}

/**
 * Component to display total price with discount breakdown
 * Suitable for cart and checkout pages
 */
export function TotalPriceDisplay({ 
  total, 
  showBreakdown = true,
  className = '' 
}: TotalPriceDisplayProps) {
  const { isEligible, calculateDiscount, discountPercentage } = usePWADiscountContext()

  const { originalAmount, discountAmount, finalAmount } = calculateDiscount(total)

  if (!isEligible) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Total:</span>
          <span>{formatPrice(originalAmount)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showBreakdown && (
        <>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Subtotal:</span>
            <span>{formatPrice(originalAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-green-600 font-medium">
            <span className="flex items-center gap-1">
              <Percent className="h-4 w-4" />
              PWA Discount ({discountPercentage}%):
            </span>
            <span>-{formatPrice(discountAmount)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2" />
        </>
      )}
      <div className="flex justify-between items-center text-xl font-bold">
        <span>Total:</span>
        <div className="flex flex-col items-end">
          {showBreakdown && (
            <span className="text-sm text-gray-500 line-through font-normal">
              {formatPrice(originalAmount)}
            </span>
          )}
          <span className="text-orange-600">{formatPrice(finalAmount)}</span>
        </div>
      </div>
      {!showBreakdown && isEligible && (
        <p className="text-xs text-green-600 text-right">
          You saved {formatPrice(discountAmount)} with PWA discount!
        </p>
      )}
    </div>
  )
}
