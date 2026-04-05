import {
	AbortMultipartUploadCommand,
	CompleteMultipartUploadCommand,
	CreateMultipartUploadCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
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

function makeS3Client(endpointUrl: string | undefined): S3Client {
	return new S3Client({
		region: env.AWS_REGION,
		...(endpointUrl && {
			endpoint: endpointUrl,
			forcePathStyle: true,
		}),
		requestChecksumCalculation: 'WHEN_REQUIRED',
		responseChecksumValidation: 'WHEN_REQUIRED',
		credentials: {
			accessKeyId: env.AWS_ACCESS_KEY_ID,
			secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		},
	});
}

const s3Ops = makeS3Client(env.AWS_ENDPOINT_URL);

// Presigned URLs are resolved by the browser, so they must embed the host-reachable
// address. In local dev this differs from the internal Docker hostname in AWS_ENDPOINT_URL.
const s3Presign = makeS3Client(env.AWS_PRESIGN_ENDPOINT_URL ?? env.AWS_ENDPOINT_URL);

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
	return getSignedUrl(s3Presign, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

export async function createMultipartUpload(
	key: string,
	contentType: string
): Promise<{ uploadId: string }> {
	const response = await s3Ops.send(
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
	return getSignedUrl(s3Presign, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

/** Parts are listed server-side because browsers cannot reliably read the ETag header from a PUT response unless CORS exposes it. */
async function listAllMultipartParts(key: string, uploadId: string) {
	const parts: Array<{ PartNumber: number; ETag: string }> = [];
	let partNumberMarker: string | undefined;

	for (;;) {
		const response = await s3Ops.send(
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
	await s3Ops.send(
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
	await s3Ops.send(
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
	return getSignedUrl(s3Presign, command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

/** Forces inline rendering in the browser rather than a file download. */
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
	return getSignedUrl(s3Presign, command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

export async function headObject(
	key: string,
	which: 'input' | 'output' = 'input'
): Promise<{ size: number; contentType: string | undefined }> {
	const response = await s3Ops.send(new HeadObjectCommand({ Bucket: bucket(which), Key: key }));
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
		await s3Ops.send(
			new DeleteObjectsCommand({
				Bucket: bucket(which),
				Delete: { Objects: batch.map((Key) => ({ Key })) },
			})
		);
	}
}

export async function listObjectKeysByPrefix(
	prefix: string,
	which: 'input' | 'output' = 'input',
): Promise<string[]> {
	const keys: string[] = [];
	let continuationToken: string | undefined;
	const bucketName = bucket(which);

	for (;;) {
		const response = await s3Ops.send(
			new ListObjectsV2Command({
				Bucket: bucketName,
				Prefix: prefix,
				ContinuationToken: continuationToken,
			}),
		);

		for (const obj of response.Contents ?? []) {
			if (obj.Key) {
				keys.push(obj.Key);
			}
		}

		if (!response.IsTruncated || !response.NextContinuationToken) {
			break;
		}

		continuationToken = response.NextContinuationToken;
	}

	return keys;
}

export { s3Ops as s3Client };
