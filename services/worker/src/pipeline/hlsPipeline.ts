import { log } from '@stream-ops/logger';
import type { EncodingRendition } from '../encoding/transcode';
import { runFFmpeg } from '../encoding/transcode';
import { uploadDirectory } from '../infra/s3';
import { outputKeyPrefixForTranscode } from '../paths';

export interface HlsPipelineParams {
	inputPath: string;
	outputDir: string;
	outputBucket: string;
	objectKey: string;
	videoId: string;
	inputHeight: number;
}

export async function runHlsEncode({
	inputPath,
	outputDir,
	videoId,
	inputHeight,
}: Pick<HlsPipelineParams, 'inputPath' | 'outputDir' | 'videoId' | 'inputHeight'>): Promise<EncodingRendition[]> {
	const start = Date.now();
	const renditions = await runFFmpeg(inputPath, outputDir, inputHeight);
	log({ stage: 'transcode_complete', videoId, renditionCount: renditions.length, durationMs: Date.now() - start });
	return renditions;
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
