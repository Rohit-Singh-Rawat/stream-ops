import fs from 'fs';
import path from 'path';
import { db, eq, videoJobs, videoThumbnails, videoRenditions, videos } from '@stream-ops/db';
import { logEvent } from './infra/logger';
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
		logEvent({ step: 'cleanup_failed', dir, error: err instanceof Error ? err.message : String(err) });
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
	logEvent({ step: 'job_created', videoId, jobId: job.id });
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

	logEvent({ step: 'pipeline_start', videoId, bucket, key, outputBucket });

	let jobId: string | null = null;

	try {
		jobId = await createJobRecord(videoId, bucket, key, outputPrefix);
		fs.mkdirSync(ws.outputDir, { recursive: true });
		fs.mkdirSync(ws.thumbnailsDir, { recursive: true });

		const inputPath = await downloadFile(bucket, key, ws.baseDir);
		logEvent({ step: 'download_complete', videoId, jobId, key });

		// Probe duration early — fails fast if the file is corrupt before we burn ffmpeg time
		const durationSeconds = await getVideoDuration(inputPath);

		await runHlsEncode({ inputPath, outputDir: ws.outputDir, videoId });
		await runThumbnailVttGeneration({
			inputPath,
			thumbnailsDir: ws.thumbnailsDir,
			spritePath: ws.spritePath,
			vttPath: ws.vttPath,
			objectKey: key,
			videoId,
		});

		await uploadHlsPackage({ outputDir: ws.outputDir, outputBucket, objectKey: key, videoId });
		await uploadThumbnailVttPackage({ spritePath: ws.spritePath, vttPath: ws.vttPath, outputBucket, objectKey: key, videoId });

		await insertRenditions(videoId, jobId, outputPrefix);
		await insertThumbnailRecord(videoId, jobId, `${thumbPrefix}/sprite.jpg`, `${thumbPrefix}/thumbnails.vtt`);

		const playbackUrl = `${outputPrefix}/master.m3u8`;
		const thumbnailVttUrl = `${thumbPrefix}/thumbnails.vtt`;
		await markJobSucceeded(jobId, videoId, playbackUrl, thumbnailVttUrl, durationSeconds);

		logEvent({ step: 'pipeline_complete', videoId, jobId, playbackUrl, thumbnailVttUrl });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		logEvent({ step: 'pipeline_failed', videoId, jobId, error: errorMessage });

		if (jobId) {
			try {
				await markJobFailed(jobId, videoId, errorMessage);
			} catch (dbErr) {
				logEvent({ step: 'mark_failed_error', videoId, jobId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
			}
		}

		throw err;
	} finally {
		if (removeWorkDir(ws.baseDir)) {
			logEvent({ step: 'cleanup_complete', videoId });
		}
	}
}
