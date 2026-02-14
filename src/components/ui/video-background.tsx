'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoBackgroundProps {
  src: string;
  className?: string;
  overlayClassName?: string;
  blur?: number;
  overlayOpacity?: number;
  enableParallax?: boolean;
  poster?: string;
}

export function VideoBackground({ 
  src, 
  className = '', 
  overlayClassName = '',
  blur = 0.5,
  overlayOpacity = 0.7,
  enableParallax = true,
  poster
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Network state detection
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('[Video Background] Network restored');
      setIsOnline(true);
      setVideoError(false); // Reset error state
      // Retry video load if it failed
      if (!isLoaded && shouldLoadVideo) {
        setShouldLoadVideo(false);
        setTimeout(() => setShouldLoadVideo(true), 100);
      }
    };

    const handleOffline = () => {
      console.log('[Video Background] Network lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isLoaded, shouldLoadVideo]);

  // Delayed video loading
  useEffect(() => {
    // Don't load video if offline
    if (!isOnline) {
      console.log('[Video Background] Skipping video load (offline)');
      return;
    }

    // Check connection speed (if available)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const slowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');

    if (slowConnection) {
      console.log('[Video Background] Slow connection detected, skipping video');
      setVideoError(true);
      return;
    }

    // Delay video loading to prevent blocking page load
    const timer = setTimeout(() => {
      setShouldLoadVideo(true);
    }, 1000); // Increased delay to 1 second

    return () => clearTimeout(timer);
  }, [isOnline]);

  useEffect(() => {
    if (!shouldLoadVideo || !isOnline) return;
    
    const video = videoRef.current;
    if (!video) return;

    // Ensure video plays on iOS and other mobile devices
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    
    // Prevent video download
    video.setAttribute('controlsList', 'nodownload noremoteplayback nofullscreen');
    video.setAttribute('disablePictureInPicture', 'true');
    video.setAttribute('disableRemotePlayback', 'true');

    // Handle video load
    const handleLoadedData = () => {
      setIsLoaded(true);
      setVideoError(false);
      console.log('[Video Background] Video loaded successfully');
    };

    // Handle video error
    const handleError = (e: Event) => {
      console.warn('[Video Background] Failed to load video:', src, e);
      setVideoError(true);
      setIsLoaded(false);
    };

    // Prevent right-click download
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent drag and drop
    const preventDrag = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('contextmenu', preventContextMenu);
    video.addEventListener('dragstart', preventDrag);

    // Attempt to play the video
    const playVideo = async () => {
      try {
        // Use requestAnimationFrame to ensure smooth playback start
        requestAnimationFrame(async () => {
          try {
            await video.play();
            console.log('[Video Background] Video playing');
          } catch (error) {
            console.log('[Video Background] Video autoplay prevented:', error);
            // Try again on user interaction
            const playOnInteraction = () => {
              video.play().catch(() => {});
              document.removeEventListener('click', playOnInteraction);
              document.removeEventListener('touchstart', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction, { once: true });
            document.addEventListener('touchstart', playOnInteraction, { once: true });
          }
        });
      } catch (error) {
        console.warn('[Video Background] Play error:', error);
      }
    };

    // Start playing after a short delay
    const playTimer = setTimeout(playVideo, 200);

    return () => {
      clearTimeout(playTimer);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('contextmenu', preventContextMenu);
      video.removeEventListener('dragstart', preventDrag);
    };
  }, [src, shouldLoadVideo, isOnline]);

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Fallback gradient background - Always visible, video fades in on top */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'linear-gradient(135deg, hsl(337, 100%, 98%) 0%, hsl(0, 0%, 100%) 50%, hsl(337, 100%, 98%) 100%)'
        }}
      />

      {/* Poster image if provided - shows while video loads */}
      {poster && !isLoaded && !videoError && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}
      
      {/* Video element - only load when ready and online */}
      {shouldLoadVideo && !videoError && isOnline && (
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          preload="metadata"
          poster={poster}
          controlsList="nodownload noremoteplayback nofullscreen"
          disablePictureInPicture
          disableRemotePlayback
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out ${
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
  );
}
