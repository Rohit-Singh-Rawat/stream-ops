'use client';

import { PlayIcon, PauseIcon, VolumeHighIcon, VolumeOffIcon, ArrowExpandIcon, ArrowShrinkIcon, Forward01Icon, Backward01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useVideo } from './use-video';
import { ProgressBar } from './progress-bar';
import { formatTime } from './utils';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isControlsVisible: boolean;
  title?: string;
  description?: string;
  onBack?: () => void;
}

export function ControlsOverlay({ videoRef, containerRef, isControlsVisible, title, description, onBack }: ControlsProps) {
  const { isPlaying, isMuted, volume, isFullscreen, duration, togglePlay, toggleMute, toggleFullscreen, skip, setVolume } = useVideo(videoRef, containerRef);
  
  const [currentTime, setCurrentTime] = useState(0);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [videoRef]);

  return (
    <div 
      className={cn(
        "absolute inset-0 z-10 flex flex-col justify-between transition-opacity duration-300 pointer-events-none",
        isControlsVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="w-full bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between pointer-events-auto">
        <button 
          onClick={onBack}
          className="text-white hover:text-primary transition p-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Go back"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={28} />
        </button>
      </div>

      <div className="absolute inset-0 flex items-center justify-center gap-8 md:gap-16 pointer-events-auto">
        <button 
          onClick={(e) => { e.stopPropagation(); skip(-10); }}
          className="text-white hover:text-primary transition hover:-rotate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-2 rounded-full"
          aria-label="Skip backward 10 seconds"
        >
          <HugeiconsIcon icon={Backward01Icon} size={42} />
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="text-white hover:scale-110 hover:text-primary transition bg-black/40 backdrop-blur-sm p-4 rounded-full border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} size={48} />
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); skip(10); }}
          className="text-white hover:text-primary transition hover:rotate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-2 rounded-full"
          aria-label="Skip forward 10 seconds"
        >
          <HugeiconsIcon icon={Forward01Icon} size={42} />
        </button>
      </div>

      <div className="w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 md:px-8 pb-6 pointer-events-auto">
        <div className="mb-4">
          {title && <h2 className="text-xl font-bold text-white mb-1 shadow-black drop-shadow-md">{title}</h2>}
          {description && <p className="text-sm text-white/80 line-clamp-2 md:w-2/3 shadow-black drop-shadow-md">{description}</p>}
        </div>

        <div className="mb-4">
          <ProgressBar videoRef={videoRef} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={togglePlay}
              className="text-white hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-1 rounded"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} size={28} />
            </button>

            <div className="flex items-center gap-2 group relative">
              <button 
                onClick={toggleMute}
                className="text-white hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-1 rounded"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <HugeiconsIcon icon={isMuted || volume === 0 ? VolumeOffIcon : VolumeHighIcon} size={28} />
              </button>
              
              <div className="w-0 overflow-hidden transition-all duration-300 ease-out group-hover:w-24 flex items-center">
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 cursor-pointer accent-primary"
                  aria-label="Volume"
                />
              </div>
            </div>

            <div className="text-sm font-medium text-white tabular-nums hidden sm:block dropdown-shadow">
              {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={toggleFullscreen}
                className="text-white hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-1 rounded"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <HugeiconsIcon icon={isFullscreen ? ArrowShrinkIcon : ArrowExpandIcon} size={28} />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
