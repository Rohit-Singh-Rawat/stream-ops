import { db, eq, videos } from '@stream-ops/db';
import {
	generateUploadUrl,
	createMultipartUpload,
	generateUploadPartUrl,
	computeMultipartPlan,
	abortMultipartUpload,
	completeMultipartUpload,
} from '../../config/s3';
import { env } from '../../config/env';
import { sendTranscodeJob } from '../../config/sqs';
import { MULTIPART_PART_SIZE } from '../../lib/constants';

export type VideoSummary = {
	id: string;
	name: string;
	size: number;
	type: string;
	status: string;
	createdAt: string;
	updatedAt: string;
};

export interface SingleUploadDescriptor {
	type: 'single';
	uploadUrl: string;
	key: string;
}

export interface MultipartUploadDescriptor {
	type: 'multipart';
	uploadId: string;
	key: string;
	partSize: number;
	parts: Array<{ partNumber: number; uploadUrl: string }>;
}

export type UploadDescriptor = SingleUploadDescriptor | MultipartUploadDescriptor;

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
	createdAt: videos.createdAt,
	updatedAt: videos.updatedAt,
} as const;

type VideoSummaryRow = {
	id: string;
	name: string;
	type: string;
	status: string;
	sourceSizeBytes: bigint | null;
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
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

function extForMime(mime: string) {
	if (mime === 'video/mp4') return '.mp4';
	if (mime === 'video/webm') return '.webm';
	return '.bin';
}

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
				status: 'created',
			})
			.returning(videoSummaryColumns);

		if (!row) {
			throw new Error('Failed to create video');
		}

		return { video: videoSummary(row) };
	}

	public async getVideoById(videoId: string): Promise<VideoSummary | null> {
		const [row] = await db
			.select(videoSummaryColumns)
			.from(videos)
			.where(eq(videos.id, videoId))
			.limit(1);
		return row ? videoSummary(row) : null;
	}

	public async presignUpload(videoId: string): Promise<PresignUploadResponse | null> {
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
				status: 'uploading',
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
				const contentLength = isLastPart ? size - (partCount - 1) * partSize : partSize;

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
				upload: { type: 'multipart', uploadId, key, partSize, parts },
			};
		}

		const uploadUrl = await generateUploadUrl(key, meta.mimeType);
		return {
			video: v,
			upload: { type: 'single', uploadUrl, key },
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
			throw new Error('Video not found');
		}

		const inputKey = video.sourceKey?.trim();
		if (!inputKey) {
			throw new Error('Video has no source key; presign upload first');
		}

		await db.update(videos).set({ status: 'queued' }).where(eq(videos.id, videoId));

		const bucket = video.sourceBucket ?? env.INPUT_BUCKET;
		await sendTranscodeJob([{ bucket, key: inputKey }]);
	}

	public async completeUpload(params: { key: string; uploadId: string }): Promise<void> {
		await completeMultipartUpload(params);

		const [video] = await db.select({ id: videos.id }).from(videos).where(eq(videos.sourceKey, params.key)).limit(1);
		if (!video) throw new Error('Video not found for completed upload');

		await this.queueTranscode(video.id);
	}

	public async abortUpload(params: { key: string; uploadId: string }): Promise<void> {
		await abortMultipartUpload(params);
	}
}
