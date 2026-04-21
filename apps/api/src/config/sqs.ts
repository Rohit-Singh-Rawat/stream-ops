import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { env } from './env';

// Not set in production — S3 event notifications trigger the Lambda directly.
// Only present locally, pointing at ElasticMQ.
const sqs = env.QUEUE_URL
	? new SQSClient({
			region: env.AWS_REGION,
			// Derive endpoint from the URL itself — amazonaws.com uses the default AWS endpoint.
			endpoint: (() => {
				const url = new URL(env.QUEUE_URL);
				return url.hostname.endsWith('.amazonaws.com') ? undefined : url.origin;
			})(),
			...(env.AWS_ACCESS_KEY_ID &&
				env.AWS_SECRET_ACCESS_KEY && {
					credentials: {
						accessKeyId: env.AWS_ACCESS_KEY_ID,
						secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
					},
				}),
	  })
	: null;

export async function sendTranscodeJob(sources: Array<{ bucket: string; key: string }>): Promise<void> {
	if (!sqs || !env.QUEUE_URL) return;
	await sqs.send(
		new SendMessageCommand({
			QueueUrl: env.QUEUE_URL,
			MessageBody: JSON.stringify({ sources }),
		}),
	);
}
