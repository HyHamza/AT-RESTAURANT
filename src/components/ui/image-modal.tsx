'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageError, setImageError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setImageError(false)
      setScale(1)
      setPosition({ x: 0, y: 0 })
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

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4))
  }

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1)
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 })
      }
      return newScale
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      handleZoomIn()
    } else {
      handleZoomOut()
    }
  }

  const handleImageClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95">
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Controls */}
        <div className="absolute top-4 left-0 right-0 flex justify-between items-center z-20 px-4 sm:px-8">
          <h3 className="text-white text-lg sm:text-xl font-semibold truncate max-w-[50%]">{alt}</h3>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 bg-black/30 rounded-lg"
              onClick={handleZoomOut}
              disabled={scale <= 1}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 bg-black/30 rounded-lg"
              onClick={handleZoomIn}
              disabled={scale >= 4}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 bg-black/30 rounded-lg"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        {/* Zoom level indicator */}
        {scale > 1 && (
          <div className="absolute top-20 right-4 sm:right-8 z-20 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            {Math.round(scale * 100)}%
          </div>
        )}
        
        {/* Image container */}
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
        >
          {!imageError ? (
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: 'center center'
              }}
              onClick={handleImageClick}
              onError={(e) => {
                console.error(`[Modal Image Error] Failed to load image: ${src}`, e)
                setImageError(true)
              }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
              <span className="text-red-500 font-semibold text-lg mb-2">Failed to load image</span>
              <span className="text-gray-400 text-sm px-4 text-center break-all max-w-2xl">{src}</span>
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="absolute bottom-4 left-0 right-0 text-center z-20">
          <div className="bg-black/70 text-white text-xs sm:text-sm px-4 py-2 rounded-full inline-block">
            {scale > 1 ? (
              <>Click & drag to pan • Scroll to zoom • Click image to reset</>
            ) : (
              <>Click image to zoom • Scroll to zoom • Press ESC to close</>
            )}
          </div>
        </div>
      </div>
      
      {/* Click outside to close - only when not zoomed */}
      {scale === 1 && (
        <div 
          className="absolute inset-0 -z-10" 
          onClick={onClose}
        />
      )}
    </div>
  )

  return createPortal(modalContent, document.body)
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
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsModalOpen(true)
  }

  return (
    <>
      <div 
        className="relative group cursor-pointer overflow-hidden w-full h-full"
        onClick={handleClick}
      >
        {!imageError ? (
          <>
            <img
              src={src}
              alt={alt}
              className={`w-full h-full transition-all duration-500 group-hover:scale-110 ${className} ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                console.error(`[Image Error] Failed to load image: ${src}`, e)
                setImageError(true)
              }}
              loading={priority ? 'eager' : 'lazy'}
              draggable={false}
            />
            
            {/* Loading state */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center pointer-events-none">
                <span className="text-gray-400 text-sm">Loading...</span>
              </div>
            )}
            
            {/* Zoom overlay - only show when image is loaded */}
            {imageLoaded && (
              <>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center pointer-events-none">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/95 rounded-full p-3 transform scale-75 group-hover:scale-100 shadow-lg">
                    <ZoomIn className="h-5 w-5 text-gray-800" />
                  </div>
                </div>

                {/* Hover hint */}
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="bg-black/70 text-white text-xs px-2 py-1 rounded text-center">
                    Click to view full size
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 flex flex-col items-center justify-center">
            <span className="text-red-600 font-medium text-sm">Failed to load image</span>
            <span className="text-red-500 text-xs mt-1 px-2 text-center break-all line-clamp-2">{src}</span>
          </div>
        )}
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