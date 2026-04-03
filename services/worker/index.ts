import { log } from '@stream-ops/logger';
import { processVideo } from './src/processor';

function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

const videoId = requireEnv('VIDEO_ID');
const bucket = requireEnv('S3_BUCKET');
const key = requireEnv('S3_KEY');
const outputBucket = requireEnv('OUTPUT_BUCKET');

log({ stage: 'worker_started', videoId, bucket, key, outputBucket });

processVideo({ videoId, bucket, key, outputBucket })
	.then(() => {
		log({ stage: 'worker_done', videoId });
		process.exit(0);
	})
	.catch((err: unknown) => {
		log({
			stage: 'worker_fatal',
			videoId,
			error: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined,
		});
		process.exit(1);
	});
