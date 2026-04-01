import { runTask } from './ecs';

interface S3Record {
	s3: {
		bucket: { name: string };
		object: { key: string };
	};
}

interface SQSRecord {
	body: string;
}

interface SQSEvent {
	Records: SQSRecord[];
}

function decodeS3Key(key: string): string {
	return decodeURIComponent(key.replace(/\+/g, ' '));
}

/**
 * Extracts videoId from the S3 key.
 * Expected key convention: uploads/<videoId>/<filename>
 * The parent segment (second-to-last) is the videoId.
 */
function videoIdFromKey(key: string): string {
	const segments = key.split('/').filter(Boolean);
	return segments.length >= 2 ? segments[segments.length - 2]! : segments[0] ?? key;
}

function parseS3Records(body: unknown): S3Record[] {
	if (typeof body !== 'object' || body === null) return [];
	const records = (body as Record<string, unknown>).Records;
	return Array.isArray(records) ? (records as S3Record[]) : [];
}

export const handler = async (event: SQSEvent): Promise<void> => {
	for (const sqsRecord of event.Records) {
		let body: unknown;
		try {
			body = JSON.parse(sqsRecord.body);
		} catch {
			console.error('Failed to parse SQS message body:', sqsRecord.body);
			continue;
		}

		if (
			typeof body === 'object' &&
			body !== null &&
			'Event' in body &&
			String((body as Record<string, unknown>).Event).toLowerCase() === 's3:testevent'
		) {
			continue;
		}

		for (const s3Record of parseS3Records(body)) {
			const bucket = s3Record.s3.bucket.name;
			const key = decodeS3Key(s3Record.s3.object.key);

			// Skip HLS output keys — S3 notifications fire on our own uploads, causing a feedback loop
			if (key.includes('/hls/') || key.startsWith('hls/')) continue;

			await runTask({ videoId: videoIdFromKey(key), bucket, key });
		}
	}
};
