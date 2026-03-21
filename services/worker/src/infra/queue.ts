import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

export interface SourceObject {
	bucket: string;
	key: string;
}

export interface TranscodeJobMessage {
	sources: SourceObject[];
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

function parseJob(body: unknown): SourceObject[] | null {
	if (body === null || typeof body !== 'object') {
		return null;
	}
	const event = body as Record<string, unknown>;

	const out: SourceObject[] = [];
	const seen = new Set<string>();

	const push = (bucket: string, key: string) => {
		const dedupe = `${bucket}\0${key}`;
		if (seen.has(dedupe)) {
			return;
		}
		seen.add(dedupe);
		out.push({ bucket, key });
	};

	if (typeof event.bucket === 'string' && event.bucket.trim() && typeof event.key === 'string' && event.key.length > 0) {
		push(event.bucket.trim(), decodeS3Key(event.key));
		return out.length > 0 ? out : null;
	}

	if (typeof event.key === 'string' && event.key.length > 0) {
		const fallback = process.env.INPUT_BUCKET?.trim();
		if (!fallback) {
			return null;
		}
		push(fallback, decodeS3Key(event.key));
		return out.length > 0 ? out : null;
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
			const name = s3.bucket?.name;
			const key = s3.object?.key;
			if (typeof name === 'string' && name.length > 0 && typeof key === 'string' && key.length > 0) {
				push(name, decodeS3Key(key));
			}
		} catch {
			continue;
		}
	}

	return out.length > 0 ? out : null;
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

				const sources = parseJob(body);
				if (!sources?.length) {
					await deleteMessage(receiptHandle);
					continue;
				}

				await handler({ sources });
				await deleteMessage(receiptHandle);
			} catch (err) {
				console.error('Worker error:', err);
			}
		}
	}
}
