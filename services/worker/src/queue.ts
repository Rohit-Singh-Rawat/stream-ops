import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

export interface TranscodeJobMessage {
	key: string;
}

const sqs = new SQSClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

const queueUrl = process.env.QUEUE_URL;

async function deleteMessage(receiptHandle: string) {
	await sqs.send(
		new DeleteMessageCommand({
			QueueUrl: queueUrl,
			ReceiptHandle: receiptHandle,
		}),
	);
}

function decodeS3Key(key: string) {
	return decodeURIComponent(key.replace(/\+/g, ' '));
}

function parseJob(body: unknown): TranscodeJobMessage | null {
	if (body === null || typeof body !== 'object') {
		return null;
	}
	const event = body as {
		key?: unknown;
		Records?: unknown[];
	};

	if (typeof event.key === 'string' && event.key.length > 0) {
		return { key: decodeS3Key(event.key) };
	}

	if (!Array.isArray(event.Records)) {
		return null;
	}

	for (const record of event.Records) {
		if (record === null || typeof record !== 'object' || !('s3' in record)) {
			continue;
		}
		try {
			const { s3 } = record as { s3: { bucket: { name: string }; object: { key: string } } };
			const {
				object: { key },
			} = s3;
			if (key) {
				return { key: decodeS3Key(key) };
			}
		} catch {
			continue;
		}
	}

	return null;
}

function isS3TestEvent(body: unknown): boolean {
	if (body === null || typeof body !== 'object') {
		return false;
	}
	const o = body as Record<string, unknown>;
	return 'Service' in o && 'Event' in o && String(o.Event).toLowerCase() === 's3:testevent';
}

export async function pollQueue(handler: (job: TranscodeJobMessage) => Promise<void>) {
	const receive = new ReceiveMessageCommand({
		QueueUrl: queueUrl,
		MaxNumberOfMessages: 1,
		WaitTimeSeconds: 20,
	});

	while (true) {
		const res = await sqs.send(receive);
		const messages = res.Messages;
		if (!messages?.length) {
			continue;
		}

		for (const msg of messages) {
			const receiptHandle = msg.ReceiptHandle!;
			try {
				const body: unknown = JSON.parse(msg.Body!);

				if (isS3TestEvent(body)) {
					await deleteMessage(receiptHandle);
					continue;
				}

				const job = parseJob(body);
				if (!job) {
					await deleteMessage(receiptHandle);
					continue;
				}

				await handler(job);
				await deleteMessage(receiptHandle);
			} catch (err) {
				console.error('Worker error:', err);
			}
		}
	}
}
