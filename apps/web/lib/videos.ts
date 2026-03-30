import {
  ACTIVE_VIDEO_STATUSES,
  type ListVideosResponse,
  type VideoStatus,
  type VideoSummary,
} from "@stream-ops/types";
import { api } from "@/lib/api";

export type VideoFilter = "all" | "processing" | "ready" | "failed";

const bytesFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const activeVideoStatuses = new Set<string>(ACTIVE_VIDEO_STATUSES);

export function isProcessingStatus(status: VideoStatus): boolean {
  return activeVideoStatuses.has(status);
}

export function hasProcessingVideos(videos: readonly VideoSummary[]): boolean {
  return videos.some((video) => isProcessingStatus(video.status));
}

export function formatFileSize(size: number): string {
  if (size <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  );
  const value = size / 1024 ** exponent;
  return `${bytesFormatter.format(value)}\u00a0${units[exponent]}`;
}

export function formatDateTime(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatVideoStatus(status: VideoStatus): string {
  switch (status) {
    case "created":
      return "Created";
    case "uploading":
      return "Uploading";
    case "uploaded":
      return "Uploaded";
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function matchesVideoFilter(
  video: VideoSummary,
  filter: VideoFilter,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery =
    normalizedQuery.length === 0 ||
    video.name.toLowerCase().includes(normalizedQuery) ||
    video.id.toLowerCase().includes(normalizedQuery);

  if (!matchesQuery) {
    return false;
  }

  switch (filter) {
    case "processing":
      return isProcessingStatus(video.status);
    case "ready":
      return video.status === "ready";
    case "failed":
      return video.status === "failed";
    default:
      return true;
  }
}

export function parseVideoFilter(
  value: string | null | undefined,
): VideoFilter {
  if (value === "processing" || value === "ready" || value === "failed") {
    return value;
  }

  return "all";
}

export async function fetchVideos(limit: number): Promise<ListVideosResponse> {
  return api.get<ListVideosResponse>(`/api/videos?limit=${limit}`);
}
