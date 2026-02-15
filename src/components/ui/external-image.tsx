'use client'

import { useState } from 'react'
import { ZoomIn } from 'lucide-react'
import { ImageModal } from './image-modal'

interface ExternalImageProps {
  src: string
  alt: string
  className?: string
}

/**
 * Component for displaying external images that may have CORS restrictions
 * Uses regular <img> tag instead of Next.js Image to bypass CORS issues
 */
export function ExternalImage({ src, alt, className = "" }: ExternalImageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <>
      <div className="relative group cursor-pointer overflow-hidden w-full h-full">
        {!imageError ? (
          <>
            <img
              src={src}
              alt={alt}
              className={`w-full h-full transition-all duration-500 group-hover:scale-110 ${className} ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
              onClick={() => setIsModalOpen(true)}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                console.error(`[External Image Error] Failed to load image: ${src}`, e)
                setImageError(true)
              }}
              loading="lazy"
            />
            
            {/* Loading state */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading...</span>
              </div>
            )}
            
            {/* Zoom overlay - only show when image is loaded */}
            {imageLoaded && (
              <>
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
