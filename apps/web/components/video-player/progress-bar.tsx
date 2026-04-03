"use client";

import { useEffect, useRef, useState } from "react";
import { type Cue, formatTime, parseVtt } from "./utils";

interface ProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  vttUrl?: string;    // LQ VTT — pre-fetched on mount
  hqVttUrl?: string;  // HQ VTT — sprite pages loaded on-demand per hover
}

interface HoverPreview {
  /** Absolute px offset from the left edge of the progress bar container */
  left: number;
  time: number;
  lqCue: Cue;
  hqCue: Cue | null;
}

export function ProgressBar({ videoRef, vttUrl, hqVttUrl }: ProgressBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [currentValue, setCurrentValue] = useState(0);
  const [duration, setDuration] = useState(0);

  const [lqCues, setLqCues] = useState<Cue[]>([]);
  const [hqCues, setHqCues] = useState<Cue[]>([]);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);

  // Tracks which HQ sprite image URLs have finished loading in the browser
  const [loadedHqSprites, setLoadedHqSprites] = useState<ReadonlySet<string>>(new Set());

  // Holds Image refs to keep LQ sprites alive in memory after pre-fetch so the
  // browser doesn't GC the request before it completes
  const lqPrefetchRefs = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    if (!vttUrl) return;
    fetch(vttUrl)
      .then((res) => res.text())
      .then((text) => setLqCues(parseVtt(text, vttUrl)))
      .catch(console.error);
  }, [vttUrl]);

  // Load HQ VTT (text is tiny; sprite images are fetched on-demand)
  useEffect(() => {
    if (!hqVttUrl) return;
    fetch(hqVttUrl)
      .then((res) => res.text())
      .then((text) => setHqCues(parseVtt(text, hqVttUrl)))
      .catch(console.error);
  }, [hqVttUrl]);

  // Pre-fetch all LQ sprite pages as soon as cues are available.
  // LQ pages are small enough to load upfront so the scrubber preview is instant.
  useEffect(() => {
    if (lqCues.length === 0) return;

    const uniqueSprites = [...new Set(lqCues.map((c) => c.image))];
    lqPrefetchRefs.current = uniqueSprites.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });

    return () => {
      lqPrefetchRefs.current = [];
    };
  }, [lqCues]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onDuration = () => setDuration(video.duration);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("loadedmetadata", onDuration);
    setDuration(video.duration || 0);
    setCurrentValue(video.currentTime || 0);
    return () => {
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("loadedmetadata", onDuration);
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
      setCurrentValue(video.currentTime);
    };

    video.addEventListener("timeupdate", updateProgress);
    return () => video.removeEventListener("timeupdate", updateProgress);
  }, [videoRef, isScrubbing]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
      const nextTime = percent * video.duration;
      video.currentTime = nextTime;
      setCurrentValue(nextTime);
    };

    updateFromPointer(e.clientX);

    const handlePointerMove = (e2: PointerEvent) => updateFromPointer(e2.clientX);
    const handlePointerUp = (e2: PointerEvent) => {
      container.releasePointerCapture(e2.pointerId);
      setIsScrubbing(false);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (!isScrubbing) setHoverPercent(percent);

    const d = videoRef.current?.duration || duration;
    if (d <= 0 || lqCues.length === 0) return;

    const hoverTime = percent * d;
    const lqCue = lqCues.find((c) => hoverTime >= c.start && hoverTime < c.end);
    if (!lqCue) {
      setHoverPreview(null);
      return;
    }

    const hqCue = hqCues.find((c) => hoverTime >= c.start && hoverTime < c.end) ?? null;

    setHoverPreview({ left: percent * rect.width, time: hoverTime, lqCue, hqCue });

    // Trigger HQ sprite load if this cue's sprite page hasn't been fetched yet.
    // Once loaded, the component re-renders and the HQ layer becomes visible.
    if (hqCue && !loadedHqSprites.has(hqCue.image)) {
      const img = new Image();
      img.onload = () =>
        setLoadedHqSprites((prev) => new Set([...prev, hqCue.image]));
      img.src = hqCue.image;
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
    const jumpAmount = 5;
    if (e.key === "ArrowRight") {
      const nextTime = Math.min(video.currentTime + jumpAmount, duration);
      video.currentTime = nextTime;
      setCurrentValue(nextTime);
    } else if (e.key === "ArrowLeft") {
      const nextTime = Math.max(video.currentTime - jumpAmount, 0);
      video.currentTime = nextTime;
      setCurrentValue(nextTime);
    }
  };

  const isHqLoaded = hoverPreview?.hqCue
    ? loadedHqSprites.has(hoverPreview.hqCue.image)
    : false;

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Video timeline"
      aria-valuemin={0}
      aria-valuemax={duration || 100}
      aria-valuenow={currentValue}
      aria-valuetext={formatTime(currentValue)}
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
          style={{ width: "100%", transform: `scaleX(${hoverPercent})` }}
        />
      )}

      <div
        ref={progressRef}
        className="absolute left-0 h-1 w-full bg-primary rounded-full origin-left will-change-transform z-10 transition-transform duration-200 group-hover:scale-y-[1.5]"
        style={{ transform: "scaleX(0)" }}
      >
        <div className="absolute right-0 top-1/2 -mt-1.5 h-3 w-3 translate-x-1/2 rounded-full bg-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
      </div>

      {hoverPreview ? (
        <div
          className="absolute bottom-6 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${hoverPreview.left}px` }}
        >
          {/* LQ always visible (pre-fetched); HQ fades in on top once its page loads.
              LQ scaled 2× — both tiers produce 800×450 sprites so display size matches. */}
          <div
            className="relative rounded overflow-hidden mb-1 border border-white/20 bg-black shadow-lg"
            style={{ width: hoverPreview.lqCue.w * 2, height: hoverPreview.lqCue.h * 2 }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: hoverPreview.lqCue.w,
                height: hoverPreview.lqCue.h,
                backgroundImage: `url(${hoverPreview.lqCue.image})`,
                backgroundPosition: `-${hoverPreview.lqCue.x}px -${hoverPreview.lqCue.y}px`,
                backgroundRepeat: "no-repeat",
                transform: "scale(2)",
                transformOrigin: "top left",
              }}
            />

            {/* HQ layer: fades in over LQ once its sprite page is in the browser cache */}
            {hoverPreview.hqCue && isHqLoaded && (
              <div
                className="absolute inset-0 animate-hq-reveal"
                style={{
                  backgroundImage: `url(${hoverPreview.hqCue.image})`,
                  backgroundPosition: `-${hoverPreview.hqCue.x}px -${hoverPreview.hqCue.y}px`,
                  backgroundRepeat: "no-repeat",
                }}
              />
            )}
          </div>

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
