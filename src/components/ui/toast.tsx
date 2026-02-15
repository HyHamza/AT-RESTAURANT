/**
 * AT RESTAURANT - Production-Grade Toast Notification System
 * 
 * Provides user-friendly feedback for all actions without relying on browser alerts
 */

'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<Toast>) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast
    }

    setToasts(prev => [...prev, newToast])

    // Auto-remove toast after duration (except loading toasts)
    if (toast.type !== 'loading' && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => removeToast(toast.id), 150) // Wait for animation
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(337, 80%, 50%)' }} />
      case 'info':
      default:
        return <Info className="h-5 w-5" style={{ color: 'hsl(337, 80%, 50%)' }} />
    }
  }

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          background: 'rgb(240, 253, 244)',
          borderColor: 'rgb(187, 247, 208)'
        }
      case 'error':
        return {
          background: 'rgb(254, 242, 242)',
          borderColor: 'rgb(254, 202, 202)'
        }
      case 'loading':
      case 'info':
      default:
        return {
          background: 'hsl(337, 100%, 98%)',
          borderColor: 'hsla(337, 80%, 50%, 0.2)'
        }
    }
  }

  const styles = getStyles()

  return (
    <div
      className={cn(
        'transform transition-all duration-300 ease-in-out',
        isVisible 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95',
        'bg-white border rounded-xl p-4'
      )}
      style={{
        backgroundColor: styles.background,
        borderColor: styles.borderColor,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold mb-1" style={{ color: 'hsl(0, 0%, 21%)' }}>
            {toast.title}
          </h4>
          {toast.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(330, 23%, 26%)' }}>
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium transition-colors"
              style={{ color: 'hsl(337, 80%, 50%)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(337, 80%, 45%)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(337, 80%, 50%)'}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        
        {toast.type !== 'loading' && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 transition-colors"
            style={{ color: 'hsl(330, 23%, 26%)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(0, 0%, 21%)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(330, 23%, 26%)'}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Convenience hooks for different toast types
export function useToastHelpers() {
  const { addToast, updateToast, removeToast } = useToast()

  return {
    success: (title: string, description?: string, options?: Partial<Toast>) => 
      addToast({ type: 'success', title, description, ...options }),
    
    error: (title: string, description?: string, options?: Partial<Toast>) => 
      addToast({ type: 'error', title, description, duration: 8000, ...options }),
    
    info: (title: string, description?: string, options?: Partial<Toast>) => 
      addToast({ type: 'info', title, description, ...options }),
    
    warning: (title: string, description?: string, options?: Partial<Toast>) => 
      addToast({ type: 'info', title, description, ...options }),
    
    loading: (title: string, description?: string) => 
      addToast({ type: 'loading', title, description, duration: 0 }),
    
    updateToast,
    removeToast
  }
}