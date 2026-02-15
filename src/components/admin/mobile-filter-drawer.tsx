'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

/**
 * Bottom drawer for mobile filters
 */
export function MobileFilterDrawer({
  isOpen,
  onClose,
  children,
  title = 'Filters'
}: MobileFilterDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">{children}</div>

          {/* Apply Button */}
          <div className="mt-6 pt-4 border-t">
            <Button
              onClick={onClose}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
