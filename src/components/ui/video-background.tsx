'use client'

import { useEffect, useRef, useState } from 'react'

interface VideoBackgroundProps {
  src: string
  className?: string
  overlayClassName?: string
  blur?: number
  overlayOpacity?: number
  enableParallax?: boolean
}

export function VideoBackground({ 
  src, 
  className = '', 
  overlayClassName = '',
  blur = 0.5,
  overlayOpacity = 0.7,
  enableParallax = true
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [videoError, setVideoError] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  useEffect(() => {
    // Check if we're offline
    const checkOnlineStatus = () => {
      setIsOffline(!navigator.onLine)
    }

    checkOnlineStatus()
    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)

    return () => {
      window.removeEventListener('online', checkOnlineStatus)
      window.removeEventListener('offline', checkOnlineStatus)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Ensure video plays on iOS and other mobile devices
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    
    // Prevent video download by disabling context menu and controls
    video.setAttribute('controlsList', 'nodownload noremoteplayback nofullscreen')
    video.setAttribute('disablePictureInPicture', 'true')
    video.setAttribute('disableRemotePlayback', 'true')
    
    // Track loading progress
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const duration = video.duration
        if (duration > 0) {
          const progress = (bufferedEnd / duration) * 100
          setLoadProgress(Math.min(progress, 100))
        }
      }
    }

    // Handle video load
    const handleLoadedData = () => {
      setIsLoaded(true)
      setIsLoading(false)
      setVideoError(false)
      setLoadProgress(100)
      console.log('[Video Background] Video loaded successfully')
    }

    // Handle video can play through
    const handleCanPlayThrough = () => {
      setIsLoading(false)
      console.log('[Video Background] Video can play through')
    }

    // Handle video error
    const handleError = (e: Event) => {
      console.error('[Video Background] Failed to load video:', src, e)
      setVideoError(true)
      setIsLoaded(false)
      setIsLoading(false)
    }

    // Prevent right-click download
    const preventContextMenu = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Prevent drag and drop
    const preventDrag = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('error', handleError)
    video.addEventListener('contextmenu', preventContextMenu)
    video.addEventListener('dragstart', preventDrag)

    // Attempt to play the video immediately (don't wait for SW)
    const playVideo = async () => {
      try {
        // Start loading immediately
        video.load()
        await video.play()
        console.log('[Video Background] Video playing')
      } catch (error) {
        console.log('[Video Background] Video autoplay prevented:', error)
        // Try again on user interaction
        const playOnInteraction = () => {
          video.play().catch(() => {})
          document.removeEventListener('click', playOnInteraction)
          document.removeEventListener('touchstart', playOnInteraction)
        }
        document.addEventListener('click', playOnInteraction, { once: true })
        document.addEventListener('touchstart', playOnInteraction, { once: true })
      }
    }

    // Start immediately (no delay)
    playVideo()

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('error', handleError)
      video.removeEventListener('contextmenu', preventContextMenu)
      video.removeEventListener('dragstart', preventDrag)
    }
  }, [src])

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Fallback gradient background - Pink/White */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'linear-gradient(135deg, hsl(337, 100%, 98%) 0%, hsl(0, 0%, 100%) 50%, hsl(337, 100%, 98%) 100%)'
        }}
      />
      
      {/* Video element with parallax effect */}
      {!videoError && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          controlsList="nodownload noremoteplayback nofullscreen"
          disablePictureInPicture
          disableRemotePlayback
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            filter: blur > 0 ? `blur(${blur}px)` : 'none',
            transform: enableParallax ? `scale(1.15) translate(var(--mouse-x, 0px), var(--mouse-y, 0px))` : 'scale(1.15)',
          }}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
      
      {/* Loading indicator - only show while actively loading */}
      {isLoading && !isLoaded && !videoError && (
        <div className="absolute bottom-4 right-4 bg-black/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading video... {Math.round(loadProgress)}%</span>
        </div>
      )}
      
      {/* Offline/Error indicator - subtle */}
      {(videoError || (isOffline && !isLoaded)) && (
        <div className="absolute bottom-4 right-4 bg-black/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
          {isOffline ? '📡 Offline Mode' : '🎬 Video unavailable'}
        </div>
      )}
      
      {/* Professional Pink/White Overlay - Foodpanda Style */}
      <div 
        className={`absolute inset-0 pointer-events-none ${overlayClassName}`}
        style={{
          background: `linear-gradient(135deg, 
            hsla(337, 100%, 98%, ${overlayOpacity}) 0%, 
            hsla(0, 0%, 100%, ${overlayOpacity * 0.9}) 30%,
            hsla(0, 0%, 100%, ${overlayOpacity * 0.8}) 50%,
            hsla(337, 100%, 98%, ${overlayOpacity * 0.9}) 70%,
            hsla(337, 80%, 50%, ${overlayOpacity * 0.1}) 100%
          )`
        }}
      />
      
      {/* Subtle gradient for depth - Pink accent at bottom */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, hsla(337, 80%, 50%, 0.05) 100%)'
        }}
      />
      
      {/* Vignette effect for focus */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsla(0, 0%, 100%, 0.3) 100%)'
        }}
      />
    </div>
  )
}
