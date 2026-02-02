'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from './button'

interface ImageModalProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 modal-backdrop">
      <div className={`relative max-w-6xl max-h-[95vh] w-full mx-4 zoom-in ${isZoomed ? 'scale-150' : 'scale-100'} transition-transform duration-300`}>
        {/* Controls */}
        <div className="absolute -top-16 left-0 right-0 flex justify-between items-center z-10">
          <h3 className="text-white text-xl font-semibold">{alt}</h3>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsZoomed(!isZoomed)}
            >
              {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        {/* Image container */}
        <div className="relative w-full h-[80vh] bg-white rounded-xl overflow-hidden shadow-2xl">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain cursor-pointer"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
            priority
            onClick={() => setIsZoomed(!isZoomed)}
          />
        </div>
        
        {/* Instructions */}
        <div className="absolute -bottom-12 left-0 right-0 text-center">
          <p className="text-white/80 text-sm">
            Click image to zoom • Press ESC to close • Click outside to close
          </p>
        </div>
      </div>
      
      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={onClose}
      />
    </div>
  )
}

interface ImageWithModalProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  sizes?: string
  priority?: boolean
}

export function ImageWithModal({ 
  src, 
  alt, 
  className = "", 
  fill = false,
  sizes,
  priority = false 
}: ImageWithModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="relative group cursor-pointer overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill={fill}
          className={`transition-all duration-500 group-hover:scale-110 ${className}`}
          sizes={sizes}
          priority={priority}
          onClick={() => setIsModalOpen(true)}
        />
        
        {/* Zoom overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/95 rounded-full p-3 transform scale-75 group-hover:scale-100 shadow-lg">
            <ZoomIn className="h-5 w-5 text-gray-800" />
          </div>
        </div>

        {/* Hover hint */}
        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded text-center">
            Click to view full size
          </div>
        </div>
      </div>
      
      <ImageModal
        src={src}
        alt={alt}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}