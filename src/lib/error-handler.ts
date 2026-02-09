/**
 * AT RESTAURANT - Production-Grade Error Handling Utility
 * 
 * This utility provides comprehensive error handling, logging, and user feedback
 * to ensure no silent failures and transparent error reporting.
 */

export interface ErrorContext {
  component: string
  action: string
  userId?: string
  orderId?: string
  itemId?: string
  additionalData?: Record<string, any>
}

export interface ErrorDetails {
  message: string
  code?: string
  details?: any
  hint?: string
  timestamp: string
  context: ErrorContext
}

export class ProductionError extends Error {
  public readonly code?: string
  public readonly details?: any
  public readonly hint?: string
  public readonly timestamp: string
  public readonly context: ErrorContext

  constructor(message: string, context: ErrorContext, options?: {
    code?: string
    details?: any
    hint?: string
    cause?: Error
  }) {
    super(message)
    this.name = 'ProductionError'
    this.code = options?.code
    this.details = options?.details
    this.hint = options?.hint
    this.timestamp = new Date().toISOString()
    this.context = context
    
    if (options?.cause) {
      this.cause = options.cause
    }
  }

  toJSON(): ErrorDetails {
    return {
      message: this.message,
      code: this.code,
      details: this.details,
      hint: this.hint,
      timestamp: this.timestamp,
      context: this.context
    }
  }
}

/**
 * Comprehensive error logger that provides detailed context and debugging information
 */
export function logError(error: Error | ProductionError | any, context: ErrorContext): string {
  const timestamp = new Date().toISOString()
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
  
  // Create structured log entry
  const logEntry = {
    errorId,
    timestamp,
    context,
    error: {
      name: error?.name || 'UnknownError',
      message: error?.message || error?.toString() || 'Unknown error occurred',
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    }
  }

  // Log to console with structured format
  console.group(`🚨 [AT RESTAURANT ERROR] ${context.component} - ${context.action}`)
  console.error(`Error ID: ${errorId}`)
  console.error(`Timestamp: ${timestamp}`)
  console.error(`Component: ${context.component}`)
  console.error(`Action: ${context.action}`)
  
  if (context.userId) console.error(`User ID: ${context.userId}`)
  if (context.orderId) console.error(`Order ID: ${context.orderId}`)
  if (context.itemId) console.error(`Item ID: ${context.itemId}`)
  
  console.error(`Message: ${logEntry.error.message}`)
  
  if (logEntry.error.code) console.error(`Code: ${logEntry.error.code}`)
  if (logEntry.error.details) console.error(`Details:`, logEntry.error.details)
  if (logEntry.error.hint) console.error(`Hint: ${logEntry.error.hint}`)
  if (context.additionalData) console.error(`Additional Data:`, context.additionalData)
  if (logEntry.error.stack) console.error(`Stack:`, logEntry.error.stack)
  
  console.groupEnd()

  // In production, you would send this to your error tracking service
  // Example: Sentry, LogRocket, DataDog, etc.
  // await sendToErrorTracking(logEntry)

  return `${errorId}: ${logEntry.error.message}`
}

/**
 * Creates user-friendly error messages based on error types
 */
export function createUserFriendlyMessage(error: Error | ProductionError | any, context: ErrorContext): string {
  const errorMessage = error?.message || error?.toString() || 'Unknown error'
  
  // Network/Connection errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'Network connection failed. Please check your internet connection and try again.'
  }
  
  // Supabase/Database errors
  if (error?.code === 'PGRST116' || errorMessage.includes('JWT')) {
    return 'Your session has expired. Please refresh the page and try again.'
  }
  
  if (error?.code === '23505' || errorMessage.includes('duplicate')) {
    return 'This item already exists. Please use a different name or check existing items.'
  }
  
  if (error?.code === '23503' || errorMessage.includes('foreign key')) {
    return 'Cannot complete this action because it would affect existing orders. Please contact support for assistance.'
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
    return 'You do not have permission to perform this action. Please contact an administrator.'
  }
  
  // Validation errors
  if (errorMessage.includes('required') || errorMessage.includes('missing')) {
    return 'Please fill in all required fields and try again.'
  }
  
  if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
    return 'Please check your input format and try again.'
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
    return 'The request took too long to complete. Please try again.'
  }
  
  // Generic fallback with context
  const actionContext = getActionContext(context.action)
  return `Failed to ${actionContext}. ${errorMessage.includes('Unknown error') ? 'Please try again or contact support if the issue persists.' : errorMessage}`
}

/**
 * Provides context-specific action descriptions for error messages
 */
function getActionContext(action: string): string {
  const actionMap: Record<string, string> = {
    'load_menu': 'load menu items',
    'add_item': 'add menu item',
    'update_item': 'update menu item',
    'delete_item': 'delete menu item',
    'add_category': 'add category',
    'update_category': 'update category',
    'delete_category': 'delete category',
    'load_orders': 'load orders',
    'update_order_status': 'update order status',
    'place_order': 'place order',
    'add_to_cart': 'add item to cart',
    'update_cart': 'update cart',
    'login': 'sign in',
    'signup': 'create account',
    'load_user_data': 'load user information'
  }
  
  return actionMap[action] || action.replace(/_/g, ' ')
}

/**
 * Handles async operations with comprehensive error handling
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options?: {
    showSuccessMessage?: boolean
    successMessage?: string
    retries?: number
    retryDelay?: number
  }
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const maxRetries = options?.retries || 0
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      
      if (options?.showSuccessMessage) {
        const message = options.successMessage || `Successfully completed ${getActionContext(context.action)}`
        console.log(`✅ [AT RESTAURANT SUCCESS] ${context.component} - ${message}`)
      }
      
      return { success: true, data: result }
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries) {
        console.warn(`⚠️ [AT RESTAURANT RETRY] ${context.component} - Attempt ${attempt + 1} failed, retrying...`)
        if (options?.retryDelay) {
          await new Promise(resolve => setTimeout(resolve, options.retryDelay))
        }
        continue
      }
      
      const errorMessage = logError(error, {
        ...context,
        additionalData: {
          ...context.additionalData,
          attempts: attempt + 1,
          maxRetries
        }
      })
      
      return { success: false, error: createUserFriendlyMessage(error, context) }
    }
  }
  
  // This should never be reached, but TypeScript requires it
  return { success: false, error: createUserFriendlyMessage(lastError, context) }
}

/**
 * Validates required fields and provides specific error messages
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: Array<{ field: string; label: string; validator?: (value: any) => boolean | string }>
): { isValid: true } | { isValid: false; error: string } {
  for (const { field, label, validator } of requiredFields) {
    const value = data[field]
    
    // Check if field exists and is not empty
    if (value === undefined || value === null || value === '') {
      return { isValid: false, error: `${label} is required` }
    }
    
    // Run custom validator if provided
    if (validator) {
      const validationResult = validator(value)
      if (validationResult !== true) {
        return { 
          isValid: false, 
          error: typeof validationResult === 'string' ? validationResult : `${label} is invalid` 
        }
      }
    }
  }
  
  return { isValid: true }
}

/**
 * Common validators for form fields
 */
export const validators = {
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) || 'Please enter a valid email address'
  },
  
  price: (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    return (!isNaN(numValue) && numValue > 0) || 'Please enter a valid price greater than 0'
  },
  
  phone: (value: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(value.replace(/\s/g, '')) || 'Please enter a valid phone number'
  },
  
  password: (value: string) => {
    return value.length >= 6 || 'Password must be at least 6 characters long'
  },
  
  url: (value: string) => {
    try {
      new URL(value)
      return true
    } catch {
      return 'Please enter a valid URL'
    }
  }
}

/**
 * Creates a loading state manager for UI components
 */
export function createLoadingManager() {
  const loadingStates = new Map<string, boolean>()
  const listeners = new Set<(states: Record<string, boolean>) => void>()
  
  return {
    setLoading: (key: string, loading: boolean) => {
      loadingStates.set(key, loading)
      const states = Object.fromEntries(loadingStates)
      listeners.forEach(listener => listener(states))
    },
    
    isLoading: (key: string) => loadingStates.get(key) || false,
    
    subscribe: (listener: (states: Record<string, boolean>) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    
    getStates: () => Object.fromEntries(loadingStates)
  }
}