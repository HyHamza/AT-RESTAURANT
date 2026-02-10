'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoBackgroundProps {
  src: string;
  className?: string;
  overlayClassName?: string;
  blur?: number;
  overlayOpacity?: number;
  enableParallax?: boolean;
}

export function VideoBackground({ 
  src, 
  className = '', 
  overlayClassName = '',
  blur = 0.5,
  overlayOpacity = 0.7,
  enableParallax = true
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  useEffect(() => {
    // CRITICAL: Delay video loading to prevent blocking page load
    // This ensures the page renders immediately with the fallback gradient
    const timer = setTimeout(() => {
      setShouldLoadVideo(true);
    }, 500); // Wait 500ms before starting video load

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldLoadVideo) return;
    
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
    const playTimer = setTimeout(playVideo, 100);

    return () => {
      clearTimeout(playTimer);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('contextmenu', preventContextMenu);
      video.removeEventListener('dragstart', preventDrag);
    };
  }, [src, shouldLoadVideo]);

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
      
      {/* Video element - only load when ready */}
      {shouldLoadVideo && !videoError && (
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          preload="metadata"
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
