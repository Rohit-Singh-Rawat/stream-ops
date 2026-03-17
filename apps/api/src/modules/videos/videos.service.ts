import {
	generateUploadUrl,
	createMultipartUpload,
	generateUploadPartUrl,
	computeMultipartPlan,
} from '../../config/s3';
import { MULTIPART_PART_SIZE } from '../../lib/constants';

export interface VideoMetadata {
	filename: string;
	contentType: string;
	size: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface SimpleUploadResponse {
	type: 'simple';
	uploadUrl: string;
}

export interface MultipartUploadResponse {
	type: 'multipart';
	uploadId: string;
	key: string;
	partSize: number;
	partCount: number;
	partUrls: string[];
}

export type UploadUrlResponse = SimpleUploadResponse | MultipartUploadResponse;

export class VideosService {
	private static instance: VideosService;

	private constructor() {}

	public static getInstance(): VideosService {
		if (!VideosService.instance) {
			VideosService.instance = new VideosService();
		}
		return VideosService.instance;
	}

	public async getuploadurl(video: VideoMetadata): Promise<UploadUrlResponse> {
		const videoId = Bun.randomUUIDv7();
		const key = `videos/${videoId}/original${this.getExtForMime(video.contentType)}`;

		// Use multipart upload for files larger than the part size threshold
		if (video.size > MULTIPART_PART_SIZE) {
			const { uploadId } = await createMultipartUpload(key, video.contentType);
			const { partSize, partCount } = computeMultipartPlan(video.size);

			const partUrls: string[] = [];
			for (let partNumber = 1; partNumber <= partCount; partNumber++) {
				const isLastPart = partNumber === partCount;
				const contentLength = isLastPart ? video.size - (partCount - 1) * partSize : partSize;

				const partUrl = await generateUploadPartUrl({
					key,
					uploadId,
					partNumber,
					contentLength,
				});
				partUrls.push(partUrl);
			}

			return {
				type: 'multipart',
				uploadId,
				key,
				partSize,
				partCount,
				partUrls,
			};
		}

		// Use simple upload for smaller files
		const uploadUrl = await generateUploadUrl(key, video.contentType);
		return {
			type: 'simple',
			uploadUrl,
		};
	}

	private getExtForMime(mime: string) {
		if (mime === 'video/mp4') return '.mp4';
		if (mime === 'video/webm') return '.webm';
		// fallback
		return '.bin';
	}
}
