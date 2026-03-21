import fs from 'fs';
import path from 'path';
import { logEvent } from './src/infra/logger';
import { pollQueue } from './src/infra/queue';
import { downloadFile } from './src/infra/s3';
import { jobWorkspaceDirName } from './src/paths';
import { runHlsEncode, uploadHlsPackage } from './src/pipeline/hlsPipeline';
import {
	runThumbnailVttGeneration,
	uploadThumbnailVttPackage,
} from './src/pipeline/thumbnailVttPipeline';

const outputBucket = process.env.OUTPUT_BUCKET;

if (!process.env.INPUT_BUCKET?.trim()) {
	throw new Error('INPUT_BUCKET is not set');
}
if (!outputBucket) {
	throw new Error('OUTPUT_BUCKET is not set');
}

function removeWorkDir(dir: string): boolean {
	try {
		fs.rmSync(dir, { recursive: true, force: true });
		return true;
	} catch (err) {
		logEvent({
			step: 'cleanup_failed',
			dir,
			error: err instanceof Error ? err.message : String(err),
		});
		return false;
	}
}

logEvent({ step: 'worker_started' });

pollQueue(async (job) => {
	for (const source of job.sources) {
		const { bucket, key } = source;

		if (key.includes('/hls/') || key.startsWith('hls/')) {
			logEvent({ step: 'source_skipped', key, reason: 'hls_output_path' });
			continue;
		}

		const videoId = jobWorkspaceDirName(key);
		const baseDir = `/tmp/${videoId}`;
		const outputDir = `${baseDir}/hls`;
		const thumbnailsDir = path.join(baseDir, 'thumbnails');
		const spritePath = path.join(thumbnailsDir, 'sprite.jpg');
		const vttPath = path.join(thumbnailsDir, 'thumbnails.vtt');

		try {
			fs.mkdirSync(baseDir, { recursive: true });
			fs.mkdirSync(outputDir, { recursive: true });

			logEvent({ step: 'source_started', videoId, bucket, key });

			const inputPath = await downloadFile(bucket, key, baseDir);
			logEvent({ step: 'download_complete', videoId, key });

			await runHlsEncode({ inputPath, outputDir, videoId });
			await runThumbnailVttGeneration({
				inputPath,
				thumbnailsDir,
				spritePath,
				vttPath,
				objectKey: key,
				videoId,
			});

			await uploadHlsPackage({ outputDir, outputBucket, objectKey: key, videoId });
			await uploadThumbnailVttPackage({
				spritePath,
				vttPath,
				outputBucket,
				objectKey: key,
				videoId,
			});
		} catch (err) {
			logEvent({
				step: 'source_failed',
				videoId,
				key,
				error: err instanceof Error ? err.message : String(err),
			});
			throw err;
		} finally {
			if (removeWorkDir(baseDir)) {
				logEvent({ step: 'cleanup_complete', videoId });
			}
		}
	}
});
