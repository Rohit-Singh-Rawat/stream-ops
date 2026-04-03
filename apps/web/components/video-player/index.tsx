"use client";

import Hls from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ControlsOverlay } from "./controls-overlay";
import { useVideo } from "./use-video";

export interface VideoPlayerProps {
  src: string;
  title?: string;
  description?: string;
  poster?: string;
  vttUrl?: string;
  hqVttUrl?: string;
  onBack?: () => void;
  className?: string;
}

type QualityOption = {
  value: number;
  label: string;
  sortKey: number;
};

export default function VideoPlayer({
  src,
  title,
  description,
  poster,
  vttUrl,
  hqVttUrl,
  onBack,
  className,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>(null);
  const { togglePlay, toggleMute, toggleFullscreen, skip, isFullscreen } =
    useVideo(videoRef, containerRef);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsMediaReady(false);

    const onLoaded = () => setIsMediaReady(true);
    const onError = () => setIsMediaReady(false);
    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("error", onError);

    let hls: Hls | null = null;
    hlsRef.current = null;
    setQualityOptions([]);
    setSelectedQuality(-1);

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
      });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!hls) return;
        const options = hls.levels
          .map((level, index) => ({
            value: index,
            label:
              level.height && level.width
                ? `${level.height}p`
                : `${Math.round(level.bitrate / 1000)} kbps`,
            sortKey: level.height ?? level.bitrate ?? 0,
          }))
          .filter(
            (level, idx, arr) =>
              arr.findIndex((item) => item.label === level.label) === idx,
          )
          .sort((a, b) => b.sortKey - a.sortKey);

        setQualityOptions(options);
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }

    return () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
      if (hls) {
        hls.destroy();
      }
      hlsRef.current = null;
    };
  }, [src]);

  const handleQualityChange = useCallback((quality: number) => {
    setSelectedQuality(quality);
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = quality;
  }, []);

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

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [showControls]);

  // Keyboard accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      showControls();

      // Ignore if target is an input or button already handling it
      if (["INPUT", "BUTTON"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
      }
    },
    [showControls, togglePlay, toggleFullscreen, toggleMute, skip],
  );

  return (
    <section
      ref={containerRef}
      className={cn(
        "relative w-full bg-black overflow-hidden flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isFullscreen
          ? "h-screen w-screen fixed inset-0 z-50 rounded-none"
          : "aspect-video max-h-[85vh] rounded-sm mx-auto shadow-2xl",
        !isControlsVisible && "cursor-none",
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: Captions are not generated by the pipeline yet. */}
      <video
        ref={videoRef}
        className={cn(
          "w-full h-full object-contain transition-opacity duration-300 ease-out",
          isMediaReady ? "opacity-100" : "opacity-0",
        )}
        poster={poster}
        playsInline
        tabIndex={0}
        aria-label="Video player"
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          e.stopPropagation();
          showControls();
          togglePlay();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
      />

      <ControlsOverlay
        videoRef={videoRef}
        containerRef={containerRef}
        isControlsVisible={isControlsVisible}
        title={title}
        description={description}
        vttUrl={vttUrl}
        hqVttUrl={hqVttUrl}
        onBack={onBack}
        qualityOptions={qualityOptions}
        selectedQuality={selectedQuality}
        onQualityChange={handleQualityChange}
      />
    </section>
  );
}
