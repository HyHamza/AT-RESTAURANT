'use client'

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
  showClearButton?: boolean
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, showClearButton = true, value, ...props }, ref) => {
    const hasValue = value && String(value).length > 0

    return (
      <div className="relative w-full">
        {/* Search Icon */}
        <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-text" />
        </div>

        {/* Input */}
        <input
          type="search"
          className={cn(
            "flex h-11 sm:h-12 w-full rounded-xl border-2 border-border bg-white",
            "pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3",
            "text-sm sm:text-base text-dark placeholder:text-muted-text",
            "transition-all duration-200",
            "focus:outline-none focus:ring-0 focus:border-pink-primary",
            "hover:border-gray-300",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
            className
          )}
          ref={ref}
          value={value}
          {...props}
        />

        {/* Clear Button */}
        {showClearButton && hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-muted-text hover:text-dark" />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
