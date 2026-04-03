import path from "path";
import { db, eq, videos, videoRenditions } from "@stream-ops/db";
import { desc } from "drizzle-orm";
import {
  ACTIVE_VIDEO_STATUSES,
  type GetVideoResponse,
  type ListVideosResponse,
  type VideoCollectionSummary,
  type VideoRendition,
  type VideoSummary,
} from "@stream-ops/types";
import { sql } from "drizzle-orm";
import {
  generateUploadUrl,
  createMultipartUpload,
  generateUploadPartUrl,
  computeMultipartPlan,
  abortMultipartUpload,
  completeMultipartUpload,
  deleteObjects,
  listObjectKeysByPrefix,
} from "../../config/s3";
import { env } from "../../config/env";
import { sendTranscodeJob } from "../../config/sqs";
import { MULTIPART_PART_SIZE } from "../../lib/constants";

export interface SingleUploadDescriptor {
  type: "single";
  uploadUrl: string;
  key: string;
}

export interface MultipartUploadDescriptor {
  type: "multipart";
  uploadId: string;
  key: string;
  partSize: number;
  parts: Array<{ partNumber: number; uploadUrl: string }>;
}

export type UploadDescriptor =
  | SingleUploadDescriptor
  | MultipartUploadDescriptor;

export type PresignUploadResponse = {
  video: VideoSummary;
  upload: UploadDescriptor;
};

const videoSummaryColumns = {
  id: videos.id,
  name: videos.name,
  type: videos.mimeType,
  status: videos.status,
  sourceSizeBytes: videos.sourceSizeBytes,
  posterUrl: videos.posterUrl,
  posterThumbUrl: videos.posterThumbUrl,
  createdAt: videos.createdAt,
  updatedAt: videos.updatedAt,
} as const;

type VideoSummaryRow = {
  id: string;
  name: string;
  type: string;
  status: VideoSummary["status"];
  sourceSizeBytes: bigint | null;
  posterUrl: string | null;
  posterThumbUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function videoSummary(row: VideoSummaryRow): VideoSummary {
  const n = row.sourceSizeBytes ?? BigInt(0);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    size: Number(n),
    posterUrl: row.posterUrl,
    posterThumbUrl: row.posterThumbUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function extForMime(mime: string) {
  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/webm") return ".webm";
  return ".bin";
}

function createEmptyCollectionSummary(): VideoCollectionSummary {
  return {
    total: 0,
    ready: 0,
    processing: 0,
    failed: 0,
  };
}

const activeVideoStatuses = new Set<string>(ACTIVE_VIDEO_STATUSES);

export class VideosService {
  private static instance: VideosService;

  private constructor() {}

  public static getInstance(): VideosService {
    if (!VideosService.instance) {
      VideosService.instance = new VideosService();
    }
    return VideosService.instance;
  }

  public async createVideo(input: {
    name: string;
    size: number;
    type: string;
  }): Promise<{ video: VideoSummary }> {
    const videoId = Bun.randomUUIDv7();
    const [row] = await db
      .insert(videos)
      .values({
        id: videoId,
        name: input.name,
        mimeType: input.type,
        sourceSizeBytes: BigInt(input.size),
        status: "created",
      })
      .returning(videoSummaryColumns);

    if (!row) {
      throw new Error("Failed to create video");
    }

    return { video: videoSummary(row) };
  }

  public async listVideos(
    input: { limit?: number } = {},
  ): Promise<ListVideosResponse> {
    const limit = input.limit ?? 48;
    const [rows, summaryRows] = await Promise.all([
      db
        .select(videoSummaryColumns)
        .from(videos)
        .orderBy(desc(videos.updatedAt), desc(videos.createdAt))
        .limit(limit),
      db
        .select({
          status: videos.status,
          count: sql<number>`count(*)::int`,
        })
        .from(videos)
        .groupBy(videos.status),
    ]);

    const summary = createEmptyCollectionSummary();
    for (const row of summaryRows) {
      summary.total += row.count;
      if (row.status === "ready") {
        summary.ready += row.count;
      }
      if (row.status === "failed") {
        summary.failed += row.count;
      }
      if (activeVideoStatuses.has(row.status)) {
        summary.processing += row.count;
      }
    }

    return {
      videos: rows.map(videoSummary),
      summary,
    };
  }

  public async getVideoById(videoId: string): Promise<GetVideoResponse | null> {
    const [videoRows, renditionRows] = await Promise.all([
      db.select(videoSummaryColumns).from(videos).where(eq(videos.id, videoId)).limit(1),
      db
        .select({
          name: videoRenditions.name,
          height: videoRenditions.height,
          bitrate: videoRenditions.bitrate,
        })
        .from(videoRenditions)
        .where(eq(videoRenditions.videoId, videoId))
        .orderBy(desc(videoRenditions.height)),
    ]);

    const row = videoRows[0];
    if (!row) return null;

    return {
      video: videoSummary(row),
      renditions: renditionRows satisfies VideoRendition[],
    };
  }

  public async presignUpload(
    videoId: string,
  ): Promise<PresignUploadResponse | null> {
    const [meta] = await db
      .select({
        mimeType: videos.mimeType,
        sourceSizeBytes: videos.sourceSizeBytes,
      })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!meta) {
      return null;
    }

    const key = `videos/${videoId}/original${extForMime(meta.mimeType)}`;
    const size = Number(meta.sourceSizeBytes ?? BigInt(0));

    const [row] = await db
      .update(videos)
      .set({
        sourceKey: key,
        sourceBucket: env.INPUT_BUCKET,
        status: "uploading",
      })
      .where(eq(videos.id, videoId))
      .returning(videoSummaryColumns);

    if (!row) {
      return null;
    }

    const v = videoSummary(row);

    if (size > MULTIPART_PART_SIZE) {
      const { uploadId } = await createMultipartUpload(key, meta.mimeType);
      const { partSize, partCount } = computeMultipartPlan(size);

      const parts: Array<{ partNumber: number; uploadUrl: string }> = [];
      for (let partNumber = 1; partNumber <= partCount; partNumber++) {
        const isLastPart = partNumber === partCount;
        const contentLength = isLastPart
          ? size - (partCount - 1) * partSize
          : partSize;

        const uploadUrl = await generateUploadPartUrl({
          key,
          uploadId,
          partNumber,
          contentLength,
        });
        parts.push({ partNumber, uploadUrl });
      }

      return {
        video: v,
        upload: { type: "multipart", uploadId, key, partSize, parts },
      };
    }

    const uploadUrl = await generateUploadUrl(key, meta.mimeType);
    return {
      video: v,
      upload: { type: "single", uploadUrl, key },
    };
  }

  public async queueTranscode(videoId: string): Promise<void> {
    const [video] = await db
      .select({
        sourceBucket: videos.sourceBucket,
        sourceKey: videos.sourceKey,
      })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video) {
      throw new Error("Video not found");
    }

    const inputKey = video.sourceKey?.trim();
    if (!inputKey) {
      throw new Error("Video has no source key; presign upload first");
    }

    await db
      .update(videos)
      .set({ status: "queued" })
      .where(eq(videos.id, videoId));

    const bucket = video.sourceBucket ?? env.INPUT_BUCKET;
    await sendTranscodeJob([{ bucket, key: inputKey }]);
  }

  public async completeUpload(params: {
    key: string;
    uploadId: string;
  }): Promise<void> {
    await completeMultipartUpload(params);

    const [video] = await db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.sourceKey, params.key))
      .limit(1);
    if (!video) throw new Error("Video not found for completed upload");

    await this.queueTranscode(video.id);
  }

  public async abortUpload(params: {
    key: string;
    uploadId: string;
  }): Promise<void> {
    await abortMultipartUpload(params);
  }

  /**
   * Deletes all videos and their associated S3 artifacts.
   *
   * This performs a best-effort cleanup of:
   * - Original uploads (input bucket)
   * - HLS renditions
   * - Poster images
   * - Preview thumbnails and VTT files
   *
   * S3 objects are removed before database rows so that a failure
   * in storage cleanup does not silently leave large orphaned blobs.
   */
  public async deleteAllVideos(): Promise<{ deletedCount: number }> {
    const rows = await db
      .select({
        id: videos.id,
        sourceBucket: videos.sourceBucket,
        sourceKey: videos.sourceKey,
        playbackUrl: videos.playbackUrl,
        thumbnailVttUrl: videos.thumbnailVttUrl,
        posterUrl: videos.posterUrl,
      })
      .from(videos);

    if (rows.length === 0) {
      return { deletedCount: 0 };
    }

    const inputKeys: string[] = [];
    const outputPrefixes = new Set<string>();

    for (const row of rows) {
      if (row.sourceKey) {
        inputKeys.push(row.sourceKey);
      }

      if (row.playbackUrl) {
        outputPrefixes.add(path.posix.dirname(row.playbackUrl));
      }

      if (row.thumbnailVttUrl) {
        outputPrefixes.add(path.posix.dirname(row.thumbnailVttUrl));
      }

      if (row.posterUrl) {
        outputPrefixes.add(path.posix.dirname(row.posterUrl));
      }
    }

    if (inputKeys.length > 0) {
      await deleteObjects(inputKeys, "input");
    }

    for (const prefix of outputPrefixes) {
      const keys = await listObjectKeysByPrefix(prefix, "output");
      if (keys.length > 0) {
        await deleteObjects(keys, "output");
      }
    }

    const deleted = await db.delete(videos).returning({ id: videos.id });
    return { deletedCount: deleted.length };
  }
}
