import path from 'path';
import { log } from '@stream-ops/logger';
import { uploadFile } from '../infra/s3';
import { thumbnailKeyPrefix } from '../paths';
import { computePreviewSpec } from '../preview/previewPolicy';
import type { PreviewSpec } from '../preview/previewPolicy';
import { extractFrames, generateSpritePage } from '../preview/thumbnail';
import { generateVttFile } from '../preview/vtt';

export interface ThumbnailVttPipelineParams {
	inputPath: string;
	thumbnailsDir: string;
	outputBucket: string;
	objectKey: string;
	videoId: string;
	durationSeconds: number;
}

export interface ThumbnailVttResult {
	spec: PreviewSpec;
	lqVttPath: string;
	hqVttPath: string;
	lqSpritePagePaths: string[];
	hqSpritePagePaths: string[];
}

export interface UploadedThumbnailKeys {
	lqVttKey: string;
	hqVttKey: string;
}

/**
 * Generates both LQ and HQ sprite pages plus their VTT cue files.
 *
 * Pipeline:
 *   1. Compute adaptive PreviewSpec from duration
 *   2. Extract all frames at HQ size (single FFmpeg decode pass)
 *   3. Tile LQ and HQ sprite pages concurrently (each reads pre-extracted JPEGs, no video decode)
 *   4. Generate both VTT files concurrently
 */
export async function runThumbnailVttGeneration(
	params: Pick<ThumbnailVttPipelineParams, 'inputPath' | 'thumbnailsDir' | 'videoId' | 'durationSeconds'>,
): Promise<ThumbnailVttResult> {
	const { inputPath, thumbnailsDir, videoId, durationSeconds } = params;
	const start = Date.now();

	const spec = computePreviewSpec(durationSeconds);
	const framesDir = path.join(thumbnailsDir, 'frames');

	log({
		stage: 'preview_spec_computed',
		videoId,
		intervalSeconds: spec.intervalSeconds,
		totalCues: spec.totalCues,
		lqPages: spec.lq.pageCount,
		hqPages: spec.hq.pageCount,
	});

	await extractFrames(inputPath, framesDir, spec);

	// LQ and HQ pages tile concurrently — read pre-extracted JPEGs, no second video decode
	const lqSpritePagePaths = Array.from(
		{ length: spec.lq.pageCount },
		(_, i) => path.join(thumbnailsDir, `sprite_lq_${i}.jpg`),
	);
	const hqSpritePagePaths = Array.from(
		{ length: spec.hq.pageCount },
		(_, i) => path.join(thumbnailsDir, `sprite_hq_${i}.jpg`),
	);

	await Promise.all([
		...lqSpritePagePaths.map((outputPath, i) => generateSpritePage(framesDir, i, 'lq', spec, outputPath)),
		...hqSpritePagePaths.map((outputPath, i) => generateSpritePage(framesDir, i, 'hq', spec, outputPath)),
	]);

	// Relative filenames — player resolves them against the VTT's own CDN URL (see parseVtt)
	const lqVttPath = path.join(thumbnailsDir, 'thumbnails_lq.vtt');
	const hqVttPath = path.join(thumbnailsDir, 'thumbnails_hq.vtt');

	await Promise.all([
		generateVttFile(
			lqVttPath,
			lqSpritePagePaths.map((_, i) => `sprite_lq_${i}.jpg`),
			spec,
			'lq',
			durationSeconds,
		),
		generateVttFile(
			hqVttPath,
			hqSpritePagePaths.map((_, i) => `sprite_hq_${i}.jpg`),
			spec,
			'hq',
			durationSeconds,
		),
	]);

	log({ stage: 'thumbnails_local_complete', videoId, durationMs: Date.now() - start });

	return { spec, lqVttPath, hqVttPath, lqSpritePagePaths, hqSpritePagePaths };
}

export async function uploadThumbnailVttPackage(
	params: Pick<ThumbnailVttPipelineParams, 'outputBucket' | 'objectKey' | 'videoId'> & ThumbnailVttResult,
): Promise<UploadedThumbnailKeys> {
	const { outputBucket, objectKey, videoId, lqVttPath, hqVttPath, lqSpritePagePaths, hqSpritePagePaths } = params;
	const prefix = thumbnailKeyPrefix(objectKey, videoId);
	const start = Date.now();

	await Promise.all([
		...lqSpritePagePaths.map((filePath, i) =>
			uploadFile(outputBucket, filePath, `${prefix}/sprite_lq_${i}.jpg`, 'image/jpeg'),
		),
		...hqSpritePagePaths.map((filePath, i) =>
			uploadFile(outputBucket, filePath, `${prefix}/sprite_hq_${i}.jpg`, 'image/jpeg'),
		),
		uploadFile(outputBucket, lqVttPath, `${prefix}/thumbnails_lq.vtt`, 'text/vtt'),
		uploadFile(outputBucket, hqVttPath, `${prefix}/thumbnails_hq.vtt`, 'text/vtt'),
	]);

	log({ stage: 'thumbnail_upload_complete', videoId, outputBucket, prefix, durationMs: Date.now() - start });

	return {
		lqVttKey: `${prefix}/thumbnails_lq.vtt`,
		hqVttKey: `${prefix}/thumbnails_hq.vtt`,
	};
}
