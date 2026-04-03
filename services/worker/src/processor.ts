import fs from 'fs';
import path from 'path';
import { log } from '@stream-ops/logger';
import { db, eq, videoJobs, videoThumbnails, videoRenditions, videos } from '@stream-ops/db';
import { downloadFile } from './infra/s3';
import { outputKeyPrefixForTranscode, thumbnailKeyPrefix } from './paths';
import { runHlsEncode, uploadHlsPackage } from './pipeline/hlsPipeline';
import { runThumbnailVttGeneration, uploadThumbnailVttPackage } from './pipeline/thumbnailVttPipeline';
import type { UploadedThumbnailKeys } from './pipeline/thumbnailVttPipeline';
import { runPosterGeneration, uploadPosterPackage } from './pipeline/posterPipeline';
import type { EncodingRendition } from './encoding/transcode';
import { getVideoInfo } from './encoding/duration';

export interface ProcessVideoInput {
	videoId: string;
	bucket: string;
	key: string;
	outputBucket: string;
}

interface Workspace {
	baseDir: string;
	outputDir: string;
	thumbnailsDir: string;
	postersDir: string;
}

function buildWorkspace(videoId: string): Workspace {
	const baseDir = `/tmp/${videoId}`;
	return {
		baseDir,
		outputDir: path.join(baseDir, 'hls'),
		thumbnailsDir: path.join(baseDir, 'thumbnails'),
		postersDir: path.join(baseDir, 'poster'),
	};
}

function removeWorkDir(dir: string): boolean {
	try {
		fs.rmSync(dir, { recursive: true, force: true });
		return true;
	} catch (err) {
		log({
			stage: 'cleanup_failed',
			dir,
			error: err instanceof Error ? err.message : String(err),
		});
		return false;
	}
}

async function createJobRecord(
	videoId: string,
	inputBucket: string,
	inputKey: string,
	outputPrefix: string,
): Promise<string> {
	const [job] = await db
		.insert(videoJobs)
		.values({ videoId, status: 'running', inputBucket, inputKey, outputPrefix, attemptCount: 1, startedAt: new Date() })
		.returning({ id: videoJobs.id });

	if (!job) throw new Error('Failed to insert video_jobs row');

	await db.update(videos).set({ status: 'processing', latestJobId: job.id }).where(eq(videos.id, videoId));
	log({ stage: 'job_created', videoId, jobId: job.id });
	return job.id;
}

async function markJobSucceeded(
	jobId: string,
	videoId: string,
	playbackUrl: string,
	thumbnailVttUrl: string | null,
	posterUrl: string,
	posterThumbUrl: string,
	durationSeconds: number,
	sourceWidth: number,
	sourceHeight: number,
): Promise<void> {
	const now = new Date();
	await db.update(videoJobs).set({ status: 'succeeded', completedAt: now }).where(eq(videoJobs.id, jobId));
	await db
		.update(videos)
		.set({
			status: 'ready',
			playbackUrl,
			thumbnailVttUrl,
			posterUrl,
			posterThumbUrl,
			durationSeconds,
			width: sourceWidth,
			height: sourceHeight,
		})
		.where(eq(videos.id, videoId));
}

async function markJobFailed(jobId: string, videoId: string, errorMessage: string): Promise<void> {
	const now = new Date();
	await db.update(videoJobs).set({ status: 'failed', completedAt: now, errorMessage }).where(eq(videoJobs.id, jobId));
	await db.update(videos).set({ status: 'failed' }).where(eq(videos.id, videoId));
}

async function insertRenditions(
	videoId: string,
	jobId: string,
	renditions: EncodingRendition[],
	outputPrefix: string,
): Promise<void> {
	await db.insert(videoRenditions).values(
		renditions.map((r) => ({
			videoId,
			jobId,
			name: r.name,
			height: r.height,
			bitrate: r.bitrate,
			// %v in the ffmpeg segment pattern maps to the 0-based stream index
			playlistUrl: `${outputPrefix}/${r.index}/prog.m3u8`,
		})),
	);
}

async function insertThumbnailRecord(
	videoId: string,
	jobId: string,
	spriteUrl: string,
	vttUrl: string,
	intervalSeconds: number,
	width: number,
	height: number,
): Promise<void> {
	await db.insert(videoThumbnails).values({
		videoId,
		jobId,
		spriteUrl,
		vttUrl,
		intervalSeconds: Math.round(intervalSeconds),
		width,
		height,
	});
}

export async function processVideo({ videoId, bucket, key, outputBucket }: ProcessVideoInput): Promise<void> {
	const ws = buildWorkspace(videoId);
	const outputPrefix = outputKeyPrefixForTranscode(key, videoId);
	const thumbPrefix = thumbnailKeyPrefix(key, videoId);

	log({ stage: 'pipeline_start', videoId, bucket, key, outputBucket });

	let jobId: string | null = null;

	try {
		jobId = await createJobRecord(videoId, bucket, key, outputPrefix);
		fs.mkdirSync(ws.outputDir, { recursive: true });
		fs.mkdirSync(ws.thumbnailsDir, { recursive: true });

		const dlStart = Date.now();
		const inputPath = await downloadFile(bucket, key, ws.baseDir);
		log({ stage: 'download_complete', videoId, jobId, key, durationMs: Date.now() - dlStart });

		const probeStart = Date.now();
		const { durationSeconds, width: sourceWidth, height: sourceHeight } = await getVideoInfo(inputPath);
		log({ stage: 'probe_complete', videoId, jobId, durationSeconds, sourceWidth, sourceHeight, durationMs: Date.now() - probeStart });

		// HLS encode, poster, and preview all read the same input independently — run concurrently.
		// Preview is wrapped so its failure does not abort HLS delivery.
		const [renditions, posterLocal, previewOutcome] = await Promise.all([
			runHlsEncode({ inputPath, outputDir: ws.outputDir, videoId, inputHeight: sourceHeight }),
			runPosterGeneration({ inputPath, postersDir: ws.postersDir, videoId, durationSeconds }),
			runThumbnailVttGeneration({ inputPath, thumbnailsDir: ws.thumbnailsDir, videoId, durationSeconds })
				.then((result) => ({ ok: true as const, result }))
				.catch((err: unknown) => ({
					ok: false as const,
					error: err instanceof Error ? err.message : String(err),
				})),
		]);

		if (!previewOutcome.ok) {
			log({ stage: 'preview_generation_failed', videoId, jobId, error: previewOutcome.error });
		}

		// Upload HLS and poster unconditionally; preview only if generation succeeded
		const [, { posterKey, posterThumbKey }] = await Promise.all([
			uploadHlsPackage({ outputDir: ws.outputDir, outputBucket, objectKey: key, videoId }),
			uploadPosterPackage({
				posterPath: posterLocal.posterPath,
				posterThumbPath: posterLocal.posterThumbPath,
				outputBucket,
				objectKey: key,
				videoId,
			}),
		]);

		let uploadedPreview: UploadedThumbnailKeys | null = null;
		if (previewOutcome.ok) {
			uploadedPreview = await uploadThumbnailVttPackage({
				...previewOutcome.result,
				outputBucket,
				objectKey: key,
				videoId,
			});
		}

		await insertRenditions(videoId, jobId, renditions, outputPrefix);

		if (previewOutcome.ok) {
			await insertThumbnailRecord(
				videoId,
				jobId,
				`${thumbPrefix}/sprite_lq_0.jpg`,
				`${thumbPrefix}/thumbnails_lq.vtt`,
				previewOutcome.result.spec.intervalSeconds,
				previewOutcome.result.spec.lq.cellWidth,
				previewOutcome.result.spec.lq.cellHeight,
			);
		}

		const playbackUrl = `${outputPrefix}/master.m3u8`;
		await markJobSucceeded(
			jobId,
			videoId,
			playbackUrl,
			uploadedPreview?.lqVttKey ?? null,
			posterKey,
			posterThumbKey,
			durationSeconds,
			sourceWidth,
			sourceHeight,
		);

		log({ stage: 'pipeline_complete', videoId, jobId, playbackUrl });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		log({ stage: 'pipeline_failed', videoId, jobId, error: errorMessage });

		if (jobId) {
			try {
				await markJobFailed(jobId, videoId, errorMessage);
			} catch (dbErr) {
				log({
					stage: 'mark_failed_error',
					videoId,
					jobId,
					error: dbErr instanceof Error ? dbErr.message : String(dbErr),
				});
			}
		}

		throw err;
	} finally {
		if (removeWorkDir(ws.baseDir)) {
			log({ stage: 'cleanup_complete', videoId });
		}
	}
}
