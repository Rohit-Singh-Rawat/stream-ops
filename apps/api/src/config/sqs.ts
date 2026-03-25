import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import { env } from './env'

const sqs = new SQSClient({
	region: env.AWS_REGION,
	...(env.AWS_ENDPOINT_URL && { endpoint: env.AWS_ENDPOINT_URL }),
	credentials: {
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
	},
})

export async function sendTranscodeJob(sources: Array<{ bucket: string; key: string }>): Promise<void> {
	await sqs.send(
		new SendMessageCommand({
			QueueUrl: env.QUEUE_URL,
			MessageBody: JSON.stringify({ sources }),
		})
	)
}

