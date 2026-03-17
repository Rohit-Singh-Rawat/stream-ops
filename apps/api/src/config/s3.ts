import {
	AbortMultipartUploadCommand,
	CompleteMultipartUploadCommand,
	CreateMultipartUploadCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
	UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
	DOWNLOAD_URL_EXPIRY_SECONDS,
	MULTIPART_PART_SIZE,
	UPLOAD_URL_EXPIRY_SECONDS,
} from '../lib/constants';
import { env } from './env';

const s3 = new S3Client({
	region: env.AWS_REGION,
	endpoint: env.S3_ENDPOINT,
	requestChecksumCalculation: 'WHEN_REQUIRED',
	responseChecksumValidation: 'WHEN_REQUIRED',
	credentials: {
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
	},
});

export async function generateUploadUrl(key: string, contentType: string): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: env.S3_BUCKET,
		Key: key,
		ContentType: contentType,
	});
	return getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

export async function createMultipartUpload(
	key: string,
	contentType: string
): Promise<{ uploadId: string }> {
	const response = await s3.send(
		new CreateMultipartUploadCommand({
			Bucket: env.S3_BUCKET,
			Key: key,
			ContentType: contentType,
		})
	);
	if (!response.UploadId) throw new Error('S3 multipart uploadId missing');
	return { uploadId: response.UploadId };
}

export async function generateUploadPartUrl(params: {
	key: string;
	uploadId: string;
	partNumber: number;
	contentLength?: number;
}): Promise<string> {
	const command = new UploadPartCommand({
		Bucket: env.S3_BUCKET,
		Key: params.key,
		UploadId: params.uploadId,
		PartNumber: params.partNumber,
		...(params.contentLength != null && { ContentLength: params.contentLength }),
	});
	return getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

export async function completeMultipartUpload(params: {
	key: string;
	uploadId: string;
	parts: Array<{ partNumber: number; etag: string }>;
}): Promise<void> {
	await s3.send(
		new CompleteMultipartUploadCommand({
			Bucket: env.S3_BUCKET,
			Key: params.key,
			UploadId: params.uploadId,
			MultipartUpload: {
				Parts: params.parts
					.slice()
					.sort((a, b) => a.partNumber - b.partNumber)
					.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
			},
		})
	);
}

export async function abortMultipartUpload(params: {
	key: string;
	uploadId: string;
}): Promise<void> {
	await s3.send(
		new AbortMultipartUploadCommand({
			Bucket: env.S3_BUCKET,
			Key: params.key,
			UploadId: params.uploadId,
		})
	);
}

export function computeMultipartPlan(sizeBytes: number): {
	partSize: number;
	partCount: number;
} {
	const partSize = MULTIPART_PART_SIZE;
	const partCount = Math.ceil(sizeBytes / partSize);
	return { partSize, partCount };
}

export async function generateDownloadUrl(key: string, filename: string): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: env.S3_BUCKET,
		Key: key,
		ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
	});
	return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

/** Inline URL for viewing in browser (images, PDFs, videos). */
export async function generateViewUrl(key: string, contentType?: string): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: env.S3_BUCKET,
		Key: key,
		ResponseContentDisposition: 'inline',
		...(contentType && { ResponseContentType: contentType }),
	});
	return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

export async function headObject(
	key: string
): Promise<{ size: number; contentType: string | undefined }> {
	const response = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
	return { size: response.ContentLength ?? 0, contentType: response.ContentType };
}

export async function deleteObjects(keys: string[]): Promise<void> {
	if (keys.length === 0) return;

	const BATCH_SIZE = 1000;
	for (let i = 0; i < keys.length; i += BATCH_SIZE) {
		const batch = keys.slice(i, i + BATCH_SIZE);
		await s3.send(
			new DeleteObjectsCommand({
				Bucket: env.S3_BUCKET,
				Delete: { Objects: batch.map((Key) => ({ Key })) },
			})
		);
	}
}

export { s3 as s3Client };
