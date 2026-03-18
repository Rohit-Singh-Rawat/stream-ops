import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export async function pollQueue(handler: (msg: any) => Promise<void>) {

	const renewMessageCommand = new ReceiveMessageCommand({
		QueueUrl: process.env.QUEUE_URL,
		MaxNumberOfMessages: 1,
		WaitTimeSeconds: 20,
	});

	while (true) {
		const res = await sqs.send(renewMessageCommand);

		if (!res.Messages || res.Messages.length === 0) continue;

		const msgs = res.Messages;

		try {
			for (const msg of msgs) {
				const body = JSON.parse(msg.Body!);
				await handler(body);

				await sqs.send(
					new DeleteMessageCommand({
						QueueUrl: process.env.QUEUE_URL,
						ReceiptHandle: msg.ReceiptHandle!,
					})
				);
			}
		} catch (err) {
			console.error('Worker error:', err);
		}
	}
}
