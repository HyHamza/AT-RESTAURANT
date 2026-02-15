'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface ParallaxHeroProps {
  children: ReactNode
  className?: string
  onMouseMove?: (x: number, y: number) => void
}

export function ParallaxHero({ children, className = '', onMouseMove }: ParallaxHeroProps) {
  const containerRef = useRef<HTMLElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      // Convert to -1 to 1 range, then scale for subtle movement
      const moveX = (x - 0.5) * 30 // Max 15px movement in each direction
      const moveY = (y - 0.5) * 30

      setMousePosition({ x: moveX, y: moveY })
      
      if (onMouseMove) {
        onMouseMove(moveX, moveY)
      }
    }

    const handleMouseLeave = () => {
      // Reset to center when mouse leaves
      setMousePosition({ x: 0, y: 0 })
      if (onMouseMove) {
        onMouseMove(0, 0)
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [onMouseMove])

  return (
    <section 
      ref={containerRef}
      className={className}
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
      } as React.CSSProperties}
    >
      {children}
    </section>
  )
}
