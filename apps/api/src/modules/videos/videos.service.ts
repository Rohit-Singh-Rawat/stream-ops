import {
	generateUploadUrl,
	createMultipartUpload,
	generateUploadPartUrl,
	computeMultipartPlan,
	abortMultipartUpload,
	completeMultipartUpload,
} from '../../config/s3';
import { MULTIPART_PART_SIZE } from '../../lib/constants';

export interface VideoMetadata {
	name: string;
	mimeType: string;
	size: number;
	createdAt: Date;
	updatedAt: Date;
}

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

export interface InitiateUploadResponse {
	file: { id: string; name: string; size: number };
	upload: UploadDescriptor;
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

	public async initiateUpload(video: VideoMetadata): Promise<InitiateUploadResponse> {
		const videoId = Bun.randomUUIDv7();
		const key = `videos/${videoId}/original${this.getExtForMime(video.mimeType)}`;

		// Use multipart upload for files larger than the part size threshold
		if (video.size > MULTIPART_PART_SIZE) {
			const { uploadId } = await createMultipartUpload(key, video.mimeType);
			const { partSize, partCount } = computeMultipartPlan(video.size);

			const parts: Array<{ partNumber: number; uploadUrl: string }> = [];
			for (let partNumber = 1; partNumber <= partCount; partNumber++) {
				const isLastPart = partNumber === partCount;
				const contentLength = isLastPart ? video.size - (partCount - 1) * partSize : partSize;

				const uploadUrl = await generateUploadPartUrl({
					key,
					uploadId,
					partNumber,
					contentLength,
				});
				parts.push({ partNumber, uploadUrl });
			}

			return {
				file: { id: videoId, name: video.name, size: video.size },
				upload: { type: 'multipart', uploadId, key, partSize, parts },
			};
		}

		// Use simple upload for smaller files
		const uploadUrl = await generateUploadUrl(key, video.mimeType);
		return {
			file: { id: videoId, name: video.name, size: video.size },
			upload: { type: 'single', uploadUrl, key },
		};
	}

	public async completeUpload(params: { key: string; uploadId: string }): Promise<void> {
		await completeMultipartUpload(params);
	}

	public async abortUpload(params: { key: string; uploadId: string }): Promise<void> {
		await abortMultipartUpload(params);
	}

	private getExtForMime(mime: string) {
		if (mime === 'video/mp4') return '.mp4';
		if (mime === 'video/webm') return '.webm';
		// fallback
		return '.bin';
	}
}
