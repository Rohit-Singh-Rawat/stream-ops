import { getVideoDuration } from '../encoding/duration';
import { logEvent } from '../infra/logger';
import { uploadFile } from '../infra/s3';
import { thumbnailKeyPrefix, webPathForThumbnailSprite } from '../paths';
import { extractThumbnails, generateSprite } from '../preview/thumbnail';
import { generateVttFile } from '../preview/vtt';

const VTT_INTERVAL_SEC = 10;
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;
const SPRITE_COLUMNS = 5;

export interface ThumbnailVttPipelineParams {
	inputPath: string;
	thumbnailsDir: string;
	spritePath: string;
	vttPath: string;
	outputBucket: string;
	objectKey: string;
	videoId: string;
}

/**
 * Thumbnail + WebVTT pipeline — local: strip frames, sprite sheet, duration probe, VTT file.
 */
export async function runThumbnailVttGeneration({
	inputPath,
	thumbnailsDir,
	spritePath,
	vttPath,
	objectKey,
	videoId,
}: Pick<
	ThumbnailVttPipelineParams,
	'inputPath' | 'thumbnailsDir' | 'spritePath' | 'vttPath' | 'objectKey' | 'videoId'
>): Promise<void> {
	await extractThumbnails(inputPath, thumbnailsDir);
	await generateSprite(inputPath, spritePath);
	const durationSeconds = await getVideoDuration(inputPath);
	const spriteWebPath = webPathForThumbnailSprite(objectKey, videoId);
	await generateVttFile(
		vttPath,
		spriteWebPath,
		durationSeconds,
		VTT_INTERVAL_SEC,
		THUMB_WIDTH,
		THUMB_HEIGHT,
		SPRITE_COLUMNS,
	);
	logEvent({ step: 'thumbnails_complete', videoId });
}

/**
 * Upload sprite + VTT for preview scrubbing.
 */
export async function uploadThumbnailVttPackage({
	spritePath,
	vttPath,
	outputBucket,
	objectKey,
	videoId,
}: Pick<
	ThumbnailVttPipelineParams,
	'spritePath' | 'vttPath' | 'outputBucket' | 'objectKey' | 'videoId'
>): Promise<void> {
	const thumbPrefix = thumbnailKeyPrefix(objectKey, videoId);
	await uploadFile(outputBucket, spritePath, `${thumbPrefix}/sprite.jpg`, 'image/jpeg');
	await uploadFile(outputBucket, vttPath, `${thumbPrefix}/thumbnails.vtt`, 'text/vtt');
	logEvent({ step: 'thumbnail_upload_complete', videoId, outputBucket, thumbPrefix });
}
