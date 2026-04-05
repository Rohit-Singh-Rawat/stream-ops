"use client";

import {
  ArrowDown01Icon,
  ArrowExpandIcon,
  ArrowLeft01Icon,
  ArrowShrinkIcon,
  Backward01Icon,
  Forward01Icon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./progress-bar";
import { useVideo } from "./use-video";
import { formatTime } from "./utils";

interface ControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isControlsVisible: boolean;
  title?: string;
  description?: string;
  vttUrl?: string;
  hqVttUrl?: string;
  onBack?: () => void;
  qualityOptions: Array<{ value: number; label: string }>;
  selectedQuality: number;
  onQualityChange: (quality: number) => void;
}

export function ControlsOverlay({
  videoRef,
  containerRef,
  isControlsVisible,
  title,
  description,
  vttUrl,
  hqVttUrl,
  onBack,
  qualityOptions,
  selectedQuality,
  onQualityChange,
}: ControlsProps) {
  const {
    isPlaying,
    isMuted,
    volume,
    isFullscreen,
    duration,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    skip,
    setVolume,
  } = useVideo(videoRef, containerRef);

  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef]);

  const qualityLabel = useMemo(() => {
    if (selectedQuality === -1) return "Auto";
    return (
      qualityOptions.find((o) => o.value === selectedQuality)?.label ?? "Auto"
    );
  }, [qualityOptions, selectedQuality]);

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col justify-between transition-opacity duration-300 pointer-events-none",
        isControlsVisible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="w-full bg-linear-to-b from-black/80 to-transparent p-4 flex items-center justify-between pointer-events-auto">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-white hover:text-primary transition p-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Go back"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={28} />
        </button>
      </div>

      <div className="absolute inset-0 flex items-center justify-center gap-8 md:gap-16 pointer-events-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            skip(-10);
          }}
          className="pointer-events-auto cursor-pointer text-white hover:text-primary transition hover:-rotate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-2 rounded-full"
          aria-label="Skip backward 10 seconds"
        >
          <HugeiconsIcon icon={Backward01Icon} size={42} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="pointer-events-auto cursor-pointer text-white hover:scale-110 hover:text-primary transition bg-black/40 backdrop-blur-sm p-4 rounded-full border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} size={48} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            skip(10);
          }}
          className="pointer-events-auto cursor-pointer text-white hover:text-primary transition hover:rotate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-2 rounded-full"
          aria-label="Skip forward 10 seconds"
        >
          <HugeiconsIcon icon={Forward01Icon} size={42} />
        </button>
      </div>

      <div className="w-full bg-linear-to-t from-black/90 via-black/40 to-transparent p-4 md:px-8 pb-6 pointer-events-auto">
        <div className="mb-4">
          {title && (
            <h2 className="text-xl font-bold text-white mb-1 shadow-black drop-shadow-md">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-white/80 line-clamp-2 md:w-2/3 shadow-black drop-shadow-md">
              {description}
            </p>
          )}
        </div>

        <div className="mb-4">
          <ProgressBar
            videoRef={videoRef}
            vttUrl={vttUrl}
            hqVttUrl={hqVttUrl}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <button
              type="button"
              onClick={togglePlay}
              className="cursor-pointer text-white hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-1 rounded"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <HugeiconsIcon
                icon={isPlaying ? PauseIcon : PlayIcon}
                size={28}
              />
            </button>

            <div className="flex items-center gap-2 group relative">
              <button
                type="button"
                onClick={toggleMute}
                className="cursor-pointer text-white hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-1 rounded"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <HugeiconsIcon
                  icon={
                    isMuted || volume === 0 ? VolumeOffIcon : VolumeHighIcon
                  }
                  size={28}
                />
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
              {formatTime(currentTime)}{" "}
              <span className="text-white/50 mx-1">/</span>{" "}
              {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 cursor-pointer gap-1.5 border-white/20 bg-black/55 px-2.5 text-xs font-medium text-white shadow-none backdrop-blur-sm",
                      "hover:bg-white/10 hover:text-white focus-visible:ring-primary",
                      "data-popup-open:bg-white/15 data-popup-open:text-white",
                    )}
                    aria-label="Video quality"
                  >
                    <span className="hidden sm:inline text-white/70">
                      Quality
                    </span>
                    <span className="tabular-nums sm:ml-0">{qualityLabel}</span>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      className="size-3.5 shrink-0 text-white/60"
                      strokeWidth={2}
                    />
                  </Button>
                }
              />
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="min-w-36 border-white/10 bg-zinc-950/95 text-zinc-100 shadow-xl ring-white/10"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">
                    Playback quality
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={String(selectedQuality)}
                    onValueChange={(v) => onQualityChange(Number(v))}
                  >
                    <DropdownMenuRadioItem
                      value="-1"
                      className="cursor-pointer text-sm focus:bg-white/10 focus:text-white data-highlighted:bg-white/10 data-highlighted:text-white"
                    >
                      Auto
                    </DropdownMenuRadioItem>
                    {qualityOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={String(option.value)}
                        className="cursor-pointer text-sm focus:bg-white/10 focus:text-white data-highlighted:bg-white/10 data-highlighted:text-white"
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="cursor-pointer text-white hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-1 rounded"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <HugeiconsIcon
                icon={isFullscreen ? ArrowShrinkIcon : ArrowExpandIcon}
                size={28}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
