import { processVideo } from './src/processor';
import { logEvent } from './src/infra/logger';

function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

const videoId = requireEnv('VIDEO_ID');
const bucket = requireEnv('S3_BUCKET');
const key = requireEnv('S3_KEY');
const outputBucket = requireEnv('OUTPUT_BUCKET');

logEvent({ step: 'worker_started', videoId, bucket, key, outputBucket });

processVideo({ videoId, bucket, key, outputBucket })
	.then(() => {
		logEvent({ step: 'worker_done', videoId });
		process.exit(0);
	})
	.catch((err: unknown) => {
		console.error(err instanceof Error ? err.stack : String(err));
		process.exit(1);
	});
