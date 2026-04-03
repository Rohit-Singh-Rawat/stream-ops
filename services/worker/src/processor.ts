import fs from 'fs';
import path from 'path';
import { log } from '@stream-ops/logger';
import { db, eq, videoJobs, videoThumbnails, videoRenditions, videos } from '@stream-ops/db';
import { downloadFile } from './infra/s3';
import { outputKeyPrefixForTranscode, thumbnailKeyPrefix } from './paths';
import { runHlsEncode, uploadHlsPackage } from './pipeline/hlsPipeline';
import { runThumbnailVttGeneration, uploadThumbnailVttPackage } from './pipeline/thumbnailVttPipeline';
import { getVideoDuration } from './encoding/duration';

const VTT_INTERVAL_SEC = 10;
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;

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
	spritePath: string;
	vttPath: string;
}

function buildWorkspace(videoId: string): Workspace {
	const baseDir = `/tmp/${videoId}`;
	return {
		baseDir,
		outputDir: path.join(baseDir, 'hls'),
		thumbnailsDir: path.join(baseDir, 'thumbnails'),
		spritePath: path.join(baseDir, 'thumbnails', 'sprite.jpg'),
		vttPath: path.join(baseDir, 'thumbnails', 'thumbnails.vtt'),
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
	thumbnailVttUrl: string,
	durationSeconds: number,
): Promise<void> {
	const now = new Date();
	await db.update(videoJobs).set({ status: 'succeeded', completedAt: now }).where(eq(videoJobs.id, jobId));
	await db.update(videos).set({ status: 'ready', playbackUrl, thumbnailVttUrl, durationSeconds }).where(eq(videos.id, videoId));
}

async function markJobFailed(jobId: string, videoId: string, errorMessage: string): Promise<void> {
	const now = new Date();
	await db.update(videoJobs).set({ status: 'failed', completedAt: now, errorMessage }).where(eq(videoJobs.id, jobId));
	await db.update(videos).set({ status: 'failed' }).where(eq(videos.id, videoId));
}

async function insertRenditions(videoId: string, jobId: string, outputPrefix: string): Promise<void> {
	const renditions = [
		{ name: '1080p', width: 1920, height: 1080, bitrate: 5000 },
		{ name: '720p', width: 1280, height: 720, bitrate: 2800 },
		{ name: '480p', width: 854, height: 480, bitrate: 1400 },
	] as const;

	await db.insert(videoRenditions).values(
		renditions.map((r) => ({
			videoId,
			jobId,
			name: r.name,
			width: r.width,
			height: r.height,
			bitrate: r.bitrate,
			playlistUrl: `${outputPrefix}/${r.height}p/prog.m3u8`,
		})),
	);
}

async function insertThumbnailRecord(videoId: string, jobId: string, spriteUrl: string, vttUrl: string): Promise<void> {
	await db.insert(videoThumbnails).values({
		videoId,
		jobId,
		spriteUrl,
		vttUrl,
		intervalSeconds: VTT_INTERVAL_SEC,
		width: THUMB_WIDTH,
		height: THUMB_HEIGHT,
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
		const durationSeconds = await getVideoDuration(inputPath);
		log({
			stage: 'duration_probe_complete',
			videoId,
			jobId,
			durationSeconds,
			durationMs: Date.now() - probeStart,
		});

		await runHlsEncode({ inputPath, outputDir: ws.outputDir, videoId });
		await runThumbnailVttGeneration({
			inputPath,
			thumbnailsDir: ws.thumbnailsDir,
			spritePath: ws.spritePath,
			vttPath: ws.vttPath,
			objectKey: key,
			videoId,
			durationSeconds,
		});

		await uploadHlsPackage({ outputDir: ws.outputDir, outputBucket, objectKey: key, videoId });
		await uploadThumbnailVttPackage({ spritePath: ws.spritePath, vttPath: ws.vttPath, outputBucket, objectKey: key, videoId });

		await insertRenditions(videoId, jobId, outputPrefix);
		await insertThumbnailRecord(videoId, jobId, `${thumbPrefix}/sprite.jpg`, `${thumbPrefix}/thumbnails.vtt`);

		const playbackUrl = `${outputPrefix}/master.m3u8`;
		const thumbnailVttUrl = `${thumbPrefix}/thumbnails.vtt`;
		await markJobSucceeded(jobId, videoId, playbackUrl, thumbnailVttUrl, durationSeconds);

		log({ stage: 'pipeline_complete', videoId, jobId, playbackUrl, thumbnailVttUrl });
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
