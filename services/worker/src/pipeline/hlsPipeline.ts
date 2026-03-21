import { runFFmpeg } from '../encoding/transcode';
import { logEvent } from '../infra/logger';
import { uploadDirectory } from '../infra/s3';
import { outputKeyPrefixForTranscode } from '../paths';

export interface HlsPipelineParams {
	inputPath: string;
	outputDir: string;
	outputBucket: string;
	objectKey: string;
	videoId: string;
}

/**
 * HLS pipeline — local: multi-rendition transcode. Upload is separate so the worker can finish all
 * local work before any S3 writes (same ordering as a single linear job).
 */
export async function runHlsEncode({
	inputPath,
	outputDir,
	videoId,
}: Pick<HlsPipelineParams, 'inputPath' | 'outputDir' | 'videoId'>): Promise<void> {
	await runFFmpeg(inputPath, outputDir);
	logEvent({ step: 'transcoding_complete', videoId });
}

export async function uploadHlsPackage({
	outputDir,
	outputBucket,
	objectKey,
	videoId,
}: Pick<HlsPipelineParams, 'outputDir' | 'outputBucket' | 'objectKey' | 'videoId'>): Promise<void> {
	const prefix = outputKeyPrefixForTranscode(objectKey, videoId);
	await uploadDirectory(outputBucket, outputDir, prefix);
	logEvent({ step: 'hls_upload_complete', videoId, outputBucket, prefix });
}
