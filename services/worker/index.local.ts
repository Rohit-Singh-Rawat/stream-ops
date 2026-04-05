import {
	DeleteMessageCommand,
	ReceiveMessageCommand,
	SQSClient,
} from '@aws-sdk/client-sqs';
import { log } from '@stream-ops/logger';
import { processVideo } from './src/processor';

function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

const QUEUE_URL = requireEnv('QUEUE_URL');
const OUTPUT_BUCKET = requireEnv('OUTPUT_BUCKET');

function sqsEndpoint(queueUrl: string): string | undefined {
	const url = new URL(queueUrl);
	return url.hostname.endsWith('.amazonaws.com') ? undefined : url.origin;
}

const sqs = new SQSClient({
	region: process.env.AWS_REGION ?? 'us-east-1',
	endpoint: sqsEndpoint(QUEUE_URL),
	credentials: {
		accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
		secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
	},
});

interface JobMessage {
	sources: Array<{ bucket: string; key: string }>;
}

// Key pattern: videos/{videoId}/original.{ext} — videoId is the second-to-last segment.
// Mirrors the same extraction logic in the production Lambda handler (apps/orchestrator/src/handler.ts).
function videoIdFromKey(key: string): string {
	const segments = key.split('/').filter(Boolean);
	return segments.length >= 2 ? segments[segments.length - 2]! : segments[0] ?? key;
}

function parseJobMessage(raw: string): JobMessage | null {
	let body: unknown;
	try {
		body = JSON.parse(raw);
	} catch {
		log({ stage: 'poll_parse_error', raw });
		return null;
	}

	if (
		typeof body !== 'object' ||
		body === null ||
		!Array.isArray((body as JobMessage).sources)
	) {
		log({ stage: 'poll_unrecognised_message', body });
		return null;
	}

	return body as JobMessage;
}

async function poll(): Promise<void> {
	log({ stage: 'poll_started', queueUrl: QUEUE_URL });

	let running = true;
	process.once('SIGTERM', () => { log({ stage: 'poll_shutdown' }); running = false; });
	process.once('SIGINT', () => { running = false; });

	while (running) {
		const res = await sqs.send(
			new ReceiveMessageCommand({
				QueueUrl: QUEUE_URL,
				MaxNumberOfMessages: 1,
				WaitTimeSeconds: 5,
			}),
		);

		const msg = res.Messages?.[0];
		if (!msg?.Body || !msg.ReceiptHandle) continue;

		const job = parseJobMessage(msg.Body);
		if (!job || !job.sources[0]) {
			await sqs.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: msg.ReceiptHandle }));
			continue;
		}

		const src = job.sources[0];
		const videoId = videoIdFromKey(src.key);

		try {
			await processVideo({ videoId, bucket: src.bucket, key: src.key, outputBucket: OUTPUT_BUCKET });
			await sqs.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: msg.ReceiptHandle }));
		} catch (err) {
			log({
				stage: 'poll_job_failed',
				videoId,
				error: err instanceof Error ? err.message : String(err),
			});
			// Do not delete — visibility timeout expires and ElasticMQ redelivers,
			// matching production SQS + Lambda retry behaviour.
		}
	}
}

poll().catch((err: unknown) => {
	log({
		stage: 'poll_fatal',
		error: err instanceof Error ? err.message : String(err),
		stack: err instanceof Error ? err.stack : undefined,
	});
	process.exit(1);
});
