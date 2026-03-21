import fs from 'fs';
import path from 'path';
import { runFFmpeg } from './src/ffmpeg';
import { logEvent } from './src/logger';
import { pollQueue } from './src/queue';
import { downloadFile, uploadDirectory } from './src/s3';
import { jobWorkspaceDirName } from './src/storageLayout';

const outputBucket = process.env.OUTPUT_BUCKET;

if (!process.env.INPUT_BUCKET?.trim()) {
	throw new Error('INPUT_BUCKET is not set');
}
if (!outputBucket) {
	throw new Error('OUTPUT_BUCKET is not set');
}

function outputKeyPrefixForTranscode(objectKey: string, videoId: string): string {
	const normalized = objectKey.replace(/\\/g, '/');
	const parent = path.posix.dirname(normalized);
	if (parent === '.' || parent === '') {
		return `hls/${videoId}`;
	}
	return `${parent}/hls`;
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

		try {
			fs.mkdirSync(baseDir, { recursive: true });
			fs.mkdirSync(outputDir, { recursive: true });

			logEvent({ step: 'source_started', videoId, bucket, key });

			const inputPath = await downloadFile(bucket, key, baseDir);
			logEvent({ step: 'download_complete', videoId, key });

			await runFFmpeg(inputPath, outputDir);
			logEvent({ step: 'transcoding_complete', videoId });

			const prefix = outputKeyPrefixForTranscode(key, videoId);
			await uploadDirectory(outputBucket, outputDir, prefix);
			logEvent({ step: 'upload_complete', videoId, outputBucket, prefix });
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
