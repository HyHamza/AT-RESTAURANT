import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency configuration with offline support
const CURRENCY_CONFIG = {
  code: 'PKR',
  locale: 'en-PK',
  symbol: 'PKR',
  name: 'Pakistani Rupee'
}

// Store currency config in localStorage for offline access
if (typeof window !== 'undefined') {
  try {
    localStorage.setItem('currency-config', JSON.stringify(CURRENCY_CONFIG))
  } catch (e) {
    // Ignore localStorage errors
  }
}

export function formatPrice(price: number): string {
  try {
    // Try to get currency from localStorage first (offline support)
    let currency = CURRENCY_CONFIG.code
    let locale = CURRENCY_CONFIG.locale

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('currency-config')
        if (stored) {
          const config = JSON.parse(stored)
          currency = config.code || currency
          locale = config.locale || locale
        }
      } catch (e) {
        // Use defaults
      }
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  } catch (error) {
    // Fallback if Intl fails (shouldn't happen, but just in case)
    return `PKR ${price.toFixed(0)}`
  }
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function generateOrderId(): string {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase()
}