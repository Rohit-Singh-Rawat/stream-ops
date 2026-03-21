'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { ControlsOverlay } from './controls-overlay';
import { cn } from '@/lib/utils';
import { useVideo } from './use-video';

export interface VideoPlayerProps {
  src: string;
  title?: string;
  description?: string;
  poster?: string;
  onBack?: () => void;
  className?: string;
}

export default function VideoPlayer({ src, title, description, poster, onBack, className }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>(null);
  const { togglePlay, toggleMute, toggleFullscreen, skip, isFullscreen } = useVideo(videoRef, containerRef);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    
    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  // Handle Controls Visibility on Idle
  const showControls = useCallback(() => {
    setIsControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    
    // Don't auto-hide if paused
    if (videoRef.current?.paused) return;

    hideControlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 2500);
  }, []);

  const handlePointerMove = useCallback(() => {
    showControls();
  }, [showControls]);

  const handlePointerLeave = useCallback(() => {
    if (!videoRef.current?.paused) {
      setIsControlsVisible(false);
    }
  }, []);

  // Sync controls visibility with play state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => showControls();
    const onPause = () => setIsControlsVisible(true);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [showControls]);

  // Keyboard accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    showControls();
    
    // Ignore if target is an input or button already handling it
    if (['INPUT', 'BUTTON'].includes((e.target as HTMLElement).tagName)) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlay();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'ArrowRight':
        e.preventDefault();
        skip(10);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skip(-10);
        break;
    }
  }, [showControls, togglePlay, toggleFullscreen, toggleMute, skip]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full bg-black overflow-hidden flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isFullscreen ? "h-screen w-screen fixed inset-0 z-50 rounded-none" : "aspect-video max-h-[85vh] rounded-2xl mx-auto shadow-2xl",
        !isControlsVisible && "cursor-none",
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={showControls}
      onDoubleClick={toggleFullscreen}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Video Player"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        playsInline
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      />
      
      <ControlsOverlay
        videoRef={videoRef}
        containerRef={containerRef}
        isControlsVisible={isControlsVisible}
        title={title}
        description={description}
        onBack={onBack}
      />
    </div>
  );
}
