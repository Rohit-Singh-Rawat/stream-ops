import fs from 'fs';
import path from 'path';
import { runFFmpeg } from './src/ffmpeg';
import { pollQueue } from './src/queue';
import { downloadFile, uploadDirectory } from './src/s3';
import { jobWorkspaceDirName } from './src/storageLayout';

const inputBucket = process.env.INPUT_BUCKET;
const outputBucket = process.env.OUTPUT_BUCKET;

if (!inputBucket) {
	throw new Error('INPUT_BUCKET is not set');
}
if (!outputBucket) {
	throw new Error('OUTPUT_BUCKET is not set');
}

console.log('Worker started...');

function outputKeyPrefixForTranscode(objectKey: string, videoId: string): string {
	const normalized = objectKey.replace(/\\/g, '/');
	const parent = path.posix.dirname(normalized);
	if (parent === '.' || parent === '') {
		return `hls/${videoId}`;
	}
	return `${parent}/hls`;
}

pollQueue(async (job) => {
	const { key } = job;

	if (key.includes('/hls/') || key.startsWith('hls/')) {
		console.log(`Skipping HLS output path to avoid loop: ${key}`);
		return;
	}

	const videoId = jobWorkspaceDirName(key);
	const baseDir = `/tmp/${videoId}`;
	const outputDir = `${baseDir}/hls`;

	fs.mkdirSync(baseDir, { recursive: true });
	fs.mkdirSync(outputDir, { recursive: true });

	const inputPath = await downloadFile(inputBucket, key, baseDir);

	console.log('Running FFmpeg...');

	await runFFmpeg(inputPath, outputDir);

	const prefix = outputKeyPrefixForTranscode(key, videoId);
	await uploadDirectory(outputBucket, outputDir, prefix);

	console.log('Transcode and upload finished');
});
