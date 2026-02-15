'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center space-x-2 text-sm', className)}
    >
      <Link 
        href="/" 
        className="flex items-center text-muted-text hover:text-pink-primary transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        
        return (
          <div key={index} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="flex items-center space-x-1 text-muted-text hover:text-pink-primary transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span 
                className={cn(
                  'flex items-center space-x-1',
                  isLast ? 'text-dark font-medium' : 'text-muted-text'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
