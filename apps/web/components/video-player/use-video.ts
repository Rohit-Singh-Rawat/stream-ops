"use client";

import { type RefObject, useCallback, useEffect, useState } from "react";

interface VideoState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  duration: number;
  isFullscreen: boolean;
}

type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

type WebkitFullscreenContainer = HTMLDivElement & {
  webkitRequestFullscreen?: () => void;
};

function getFullscreenElement(doc: WebkitFullscreenDocument): Element | null {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function useVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const [state, setState] = useState<VideoState>({
    isPlaying: false,
    isMuted: false,
    volume: 1,
    duration: 0,
    isFullscreen: false,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const handlePause = () => setState((s) => ({ ...s, isPlaying: false }));
    const handleVolumeChange = () => {
      setState((s) => ({
        ...s,
        volume: video.volume,
        isMuted: video.muted || video.volume === 0,
      }));
    };
    const handleDurationChange = () =>
      setState((s) => ({ ...s, duration: video.duration }));

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("loadedmetadata", handleDurationChange);

    setState({
      isPlaying: !video.paused,
      isMuted: video.muted || video.volume === 0,
      volume: video.volume,
      duration: video.duration || 0,
      isFullscreen: !!document.fullscreenElement,
    });

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("loadedmetadata", handleDurationChange);
    };
  }, [videoRef]);

  useEffect(() => {
    const fullscreenDocument = document as WebkitFullscreenDocument;

    const handleFullscreenChange = () => {
      setState((s) => ({
        ...s,
        isFullscreen: !!getFullscreenElement(fullscreenDocument),
      }));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, [videoRef]);

  const setVolume = useCallback(
    (value: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.volume = Math.max(0, Math.min(1, value));
      if (value > 0 && video.muted) {
        video.muted = false;
      }
    },
    [videoRef],
  );

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current as WebkitFullscreenContainer | null;
    const fullscreenDocument = document as WebkitFullscreenDocument;
    if (!container) return;

    const isFS = !!getFullscreenElement(fullscreenDocument);

    if (!isFS) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (fullscreenDocument.webkitExitFullscreen) {
        fullscreenDocument.webkitExitFullscreen();
      }
    }
  }, [containerRef]);

  const skip = useCallback(
    (amount: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(
        0,
        Math.min(video.duration || 0, video.currentTime + amount),
      );
    },
    [videoRef],
  );

  return {
    ...state,
    togglePlay,
    toggleMute,
    setVolume,
    toggleFullscreen,
    skip,
  };
}
