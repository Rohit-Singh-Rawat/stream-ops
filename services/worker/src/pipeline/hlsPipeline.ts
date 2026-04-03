import { log } from '@stream-ops/logger';
import { runFFmpeg } from '../encoding/transcode';
import { uploadDirectory } from '../infra/s3';
import { outputKeyPrefixForTranscode } from '../paths';

export interface HlsPipelineParams {
	inputPath: string;
	outputDir: string;
	outputBucket: string;
	objectKey: string;
	videoId: string;
}

export async function runHlsEncode({
	inputPath,
	outputDir,
	videoId,
}: Pick<HlsPipelineParams, 'inputPath' | 'outputDir' | 'videoId'>): Promise<void> {
	const start = Date.now();
	await runFFmpeg(inputPath, outputDir);
	log({ stage: 'transcode_complete', videoId, durationMs: Date.now() - start });
}

export async function uploadHlsPackage({
	outputDir,
	outputBucket,
	objectKey,
	videoId,
}: Pick<HlsPipelineParams, 'outputDir' | 'outputBucket' | 'objectKey' | 'videoId'>): Promise<void> {
	const prefix = outputKeyPrefixForTranscode(objectKey, videoId);
	const start = Date.now();
	await uploadDirectory(outputBucket, outputDir, prefix);
	log({ stage: 'hls_upload_complete', videoId, outputBucket, prefix, durationMs: Date.now() - start });
}
