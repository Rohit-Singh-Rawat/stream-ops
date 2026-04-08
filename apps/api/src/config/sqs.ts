import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { env } from './env';

// Derive the SQS base endpoint from the queue URL so S3 and SQS can point to
// different services. In production the URL is amazonaws.com — no override needed.
// Locally it points to ElasticMQ, which is a different host than MinIO (S3).
function sqsEndpoint(queueUrl: string): string | undefined {
	const url = new URL(queueUrl);
	return url.hostname.endsWith('.amazonaws.com') ? undefined : url.origin;
}

const sqs = new SQSClient({
	region: env.AWS_REGION,
	endpoint: sqsEndpoint(env.QUEUE_URL),
	// Omitting credentials lets the SDK fall through to the ECS task IAM role.
	...(env.AWS_ACCESS_KEY_ID &&
		env.AWS_SECRET_ACCESS_KEY && {
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID,
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
			},
		}),
});

export async function sendTranscodeJob(sources: Array<{ bucket: string; key: string }>): Promise<void> {
	await sqs.send(
		new SendMessageCommand({
			QueueUrl: env.QUEUE_URL,
			MessageBody: JSON.stringify({ sources }),
		})
	);
}
