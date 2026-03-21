'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { formatTime, parseVtt, type Cue } from './utils';

interface ProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  vttUrl?: string;
}

export function ProgressBar({ videoRef, vttUrl }: ProgressBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [cues, setCues] = useState<Cue[]>([]);
  const [hoverPreview, setHoverPreview] = useState<{
    left: number;
    cue: Cue;
    time: number;
  } | null>(null);

  useEffect(() => {
    if (!vttUrl) return;
    fetch(vttUrl)
      .then((res) => res.text())
      .then((text) => setCues(parseVtt(text, vttUrl)))
      .catch(console.error);
  }, [vttUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onDuration = () => setDuration(video.duration);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('loadedmetadata', onDuration);
    setDuration(video.duration || 0);
    return () => {
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('loadedmetadata', onDuration);
    };
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const updateProgress = () => {
      if (isScrubbing || !video.duration) return;
      const percent = video.currentTime / video.duration;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${percent})`;
      }
      container.setAttribute('aria-valuenow', video.currentTime.toString());
      container.setAttribute('aria-valuetext', formatTime(video.currentTime));
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, [videoRef, isScrubbing]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !video.duration) return;

    container.setPointerCapture(e.pointerId);

    const updateFromPointer = (clientX: number) => {
      const rect = container.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${percent})`;
      }
      video.currentTime = percent * video.duration;
    };
    
    updateFromPointer(e.clientX);

    const handlePointerMove = (e2: PointerEvent) => {
      updateFromPointer(e2.clientX);
    };

    const handlePointerUp = (e2: PointerEvent) => {
      container.releasePointerCapture(e2.pointerId);
      setIsScrubbing(false);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
  }, [videoRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    if (!isScrubbing) {
      setHoverPercent(percent);
    }
    
    const d = videoRef.current?.duration || duration;
    if (d > 0 && cues.length > 0) {
      const hoverTime = percent * d;
      const cue = cues.find(c => hoverTime >= c.start && hoverTime < c.end);
      if (cue) {
        setHoverPreview({
          left: percent * rect.width, // absolute px position inside the container
          cue,
          time: hoverTime
        });
      } else {
        setHoverPreview(null);
      }
    }
  };

  const handlePointerLeave = () => {
    if (!isScrubbing) {
      setHoverPercent(null);
      setHoverPreview(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    
    const jumpAmount = 5; // 5 seconds
    if (e.key === 'ArrowRight') {
      video.currentTime = Math.min(video.currentTime + jumpAmount, duration);
    } else if (e.key === 'ArrowLeft') {
      video.currentTime = Math.max(video.currentTime - jumpAmount, 0);
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Video timeline"
      aria-valuemin={0}
      aria-valuemax={duration || 100}
      className="group relative h-4 w-full cursor-pointer flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute left-0 right-0 h-1 bg-white/30 rounded-full transition-transform duration-200 group-hover:scale-y-[1.5]" />
      
      {hoverPercent !== null && (
        <div 
          className="absolute left-0 h-1 bg-white/50 rounded-full origin-left transition-transform duration-200 group-hover:scale-y-[1.5]"
          style={{ width: '100%', transform: `scaleX(${hoverPercent})` }}
        />
      )}

      <div 
        ref={progressRef}
        className="absolute left-0 h-1 w-full bg-primary rounded-full origin-left will-change-transform z-10 transition-transform duration-200 group-hover:scale-y-[1.5]"
        style={{ transform: 'scaleX(0)' }}
      >
        <div className="absolute right-0 top-1/2 -mt-1.5 h-3 w-3 translate-x-1/2 rounded-full bg-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
      </div>

      {hoverPreview ? (
        <div 
          className="absolute bottom-6 -translate-x-1/2 rounded flex flex-col items-center shadow-lg pointer-events-none"
          style={{ left: `${hoverPreview.left}px` }}
        >
          <div
            className="rounded overflow-hidden mb-1 border border-white/20 bg-black"
            style={{
              width: hoverPreview.cue.w,
              height: hoverPreview.cue.h,
              backgroundImage: `url(${hoverPreview.cue.image})`,
              backgroundPosition: `-${hoverPreview.cue.x}px -${hoverPreview.cue.y}px`,
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="bg-black/80 px-2 py-0.5 text-xs font-medium text-white shadow rounded">
            {formatTime(hoverPreview.time)}
          </div>
        </div>
      ) : hoverPercent !== null && duration > 0 ? (
        <div 
          className="absolute bottom-6 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-xs font-medium text-white shadow pointer-events-none"
          style={{ left: `${hoverPercent * 100}%` }}
        >
          {formatTime(hoverPercent * duration)}
        </div>
      ) : null}
    </div>
  );
}
