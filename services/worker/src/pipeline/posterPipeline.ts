import { log } from '@stream-ops/logger';
import { uploadFile } from '../infra/s3';
import { posterKeyPrefix } from '../paths';
import { generatePosters } from '../preview/posterThumbnail';

export interface PosterPipelineParams {
	inputPath: string;
	postersDir: string;
	outputBucket: string;
	objectKey: string;
	videoId: string;
	durationSeconds: number;
}

export interface PosterS3Keys {
	posterKey: string;
	posterThumbKey: string;
}

export async function runPosterGeneration(
	params: Pick<PosterPipelineParams, 'inputPath' | 'postersDir' | 'videoId' | 'durationSeconds'>,
): Promise<{ posterPath: string; posterThumbPath: string }> {
	const { inputPath, postersDir, videoId, durationSeconds } = params;
	const start = Date.now();
	const output = await generatePosters(inputPath, postersDir, durationSeconds);
	log({ stage: 'posters_local_complete', videoId, durationMs: Date.now() - start });
	return output;
}

export async function uploadPosterPackage(
	params: Pick<PosterPipelineParams, 'outputBucket' | 'objectKey' | 'videoId'> & {
		posterPath: string;
		posterThumbPath: string;
	},
): Promise<PosterS3Keys> {
	const { outputBucket, objectKey, videoId, posterPath, posterThumbPath } = params;
	const prefix = posterKeyPrefix(objectKey, videoId);
	const start = Date.now();

	const posterKey = `${prefix}/poster.jpg`;
	const posterThumbKey = `${prefix}/poster_thumb.jpg`;

	await Promise.all([
		uploadFile(outputBucket, posterPath, posterKey, 'image/jpeg'),
		uploadFile(outputBucket, posterThumbPath, posterThumbKey, 'image/jpeg'),
	]);

	log({ stage: 'poster_upload_complete', videoId, outputBucket, prefix, durationMs: Date.now() - start });

	return { posterKey, posterThumbKey };
}
