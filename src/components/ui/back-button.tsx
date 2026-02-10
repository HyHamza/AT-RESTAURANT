'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
  variant?: 'default' | 'ghost' | 'outline'
}

export function BackButton({ 
  href, 
  label = 'Back', 
  className,
  variant = 'ghost'
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={cn(
        'group transition-all',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
      {label}
    </Button>
  )
}
