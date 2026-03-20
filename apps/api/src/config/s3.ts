import {
	AbortMultipartUploadCommand,
	CompleteMultipartUploadCommand,
	CreateMultipartUploadCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListPartsCommand,
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
	requestChecksumCalculation: 'WHEN_REQUIRED',
	responseChecksumValidation: 'WHEN_REQUIRED',
	credentials: {
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
	},
});

/** `input` = originals / uploads; `output` = transcoded HLS, etc. */
function bucket(which: 'input' | 'output'): string {
	return which === 'input' ? env.INPUT_BUCKET : env.OUTPUT_BUCKET;
}

export async function generateUploadUrl(key: string, contentType: string): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: bucket('input'),
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
			Bucket: bucket('input'),
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
		Bucket: bucket('input'),
		Key: params.key,
		UploadId: params.uploadId,
		PartNumber: params.partNumber,
		...(params.contentLength != null && { ContentLength: params.contentLength }),
	});
	return getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

/** Lists parts via the SDK (not the browser). Browsers often cannot read ETag on PUT to S3 unless CORS exposes it. */
async function listAllMultipartParts(key: string, uploadId: string) {
	const parts: Array<{ PartNumber: number; ETag: string }> = [];
	let partNumberMarker: string | undefined;

	for (;;) {
		const response = await s3.send(
			new ListPartsCommand({
				Bucket: bucket('input'),
				Key: key,
				UploadId: uploadId,
				...(partNumberMarker != null && { PartNumberMarker: partNumberMarker }),
			})
		);
		for (const p of response.Parts ?? []) {
			if (p.PartNumber != null && p.ETag != null) {
				parts.push({ PartNumber: p.PartNumber, ETag: p.ETag });
			}
		}
		if (!response.IsTruncated || response.NextPartNumberMarker == null) break;
		partNumberMarker = String(response.NextPartNumberMarker);
	}

	return parts;
}

export async function completeMultipartUpload(params: { key: string; uploadId: string }): Promise<void> {
	const listed = await listAllMultipartParts(params.key, params.uploadId);
	if (listed.length === 0) {
		throw new Error('No parts found for this multipart upload (upload may have failed or expired)');
	}
	listed.sort((a, b) => a.PartNumber - b.PartNumber);
	await s3.send(
		new CompleteMultipartUploadCommand({
			Bucket: bucket('input'),
			Key: params.key,
			UploadId: params.uploadId,
			MultipartUpload: {
				Parts: listed.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
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
			Bucket: bucket('input'),
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

export async function generateDownloadUrl(
	key: string,
	filename: string,
	which: 'input' | 'output' = 'input'
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: bucket(which),
		Key: key,
		ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
	});
	return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

/** Inline URL for viewing in browser (images, PDFs, videos, HLS). */
export async function generateViewUrl(
	key: string,
	contentType?: string,
	which: 'input' | 'output' = 'input'
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: bucket(which),
		Key: key,
		ResponseContentDisposition: 'inline',
		...(contentType && { ResponseContentType: contentType }),
	});
	return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

export async function headObject(
	key: string,
	which: 'input' | 'output' = 'input'
): Promise<{ size: number; contentType: string | undefined }> {
	const response = await s3.send(new HeadObjectCommand({ Bucket: bucket(which), Key: key }));
	return { size: response.ContentLength ?? 0, contentType: response.ContentType };
}

export async function deleteObjects(
	keys: string[],
	which: 'input' | 'output' = 'input'
): Promise<void> {
	if (keys.length === 0) return;

	const BATCH_SIZE = 1000;
	for (let i = 0; i < keys.length; i += BATCH_SIZE) {
		const batch = keys.slice(i, i + BATCH_SIZE);
		await s3.send(
			new DeleteObjectsCommand({
				Bucket: bucket(which),
				Delete: { Objects: batch.map((Key) => ({ Key })) },
			})
		);
	}
}

export { s3 as s3Client };
