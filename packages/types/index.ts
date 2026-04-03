export const VIDEO_STATUSES = [
  "created",
  "uploading",
  "uploaded",
  "queued",
  "processing",
  "ready",
  "failed",
] as const;

export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const ACTIVE_VIDEO_STATUSES = [
  "created",
  "uploading",
  "uploaded",
  "queued",
  "processing",
] as const satisfies readonly VideoStatus[];

export interface VideoSummary {
  id: string;
  name: string;
  size: number;
  type: string;
  status: VideoStatus;
  posterUrl: string | null;
  posterThumbUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoRendition {
  name: string;
  height: number;
  bitrate: number | null;
}

export interface VideoCollectionSummary {
  total: number;
  ready: number;
  processing: number;
  failed: number;
}

export interface ListVideosResponse {
  videos: VideoSummary[];
  summary: VideoCollectionSummary;
}

export interface GetVideoResponse {
  video: VideoSummary;
  renditions: VideoRendition[];
}
