import {
	RequestChecksumCalculation,
	ResponseChecksumValidation,
} from '@aws-sdk/middleware-flexible-checksums';
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import type { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { resolveVideoInputExtension } from './inputExtension';

const s3 = new S3Client({
	region: process.env.AWS_REGION,
	forcePathStyle: true,
	requestChecksumCalculation: RequestChecksumCalculation.WHEN_REQUIRED,
	responseChecksumValidation: ResponseChecksumValidation.WHEN_REQUIRED,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

const UPLOAD_CONCURRENCY = 8;

function assertReadableBody(body: unknown): asserts body is Readable {
	if (
		body === null ||
		typeof body !== 'object' ||
		typeof (body as Readable).pipe !== 'function'
	) {
		throw new Error('S3 GetObject returned a non-stream body');
	}
}

export async function downloadFile(bucket: string, key: string, destDir: string): Promise<string> {
	const res = await s3.send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		}),
	);

	const ext = resolveVideoInputExtension(key, res.ContentType);
	const destPath = path.join(destDir, `source${ext}`);

	const body = res.Body;
	assertReadableBody(body);

	await pipeline(body, fs.createWriteStream(destPath));

	return destPath;
}

async function* walkFiles(rootDir: string): AsyncGenerator<string> {
	const entries = await readdir(rootDir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(rootDir, entry.name);
		if (entry.isDirectory()) {
			yield* walkFiles(fullPath);
		} else if (entry.isFile()) {
			yield fullPath;
		}
	}
}

function contentTypeForArtifact(relativePath: string): string {
	const ext = path.extname(relativePath).toLowerCase();
	if (ext === '.m3u8') {
		return 'application/vnd.apple.mpegurl';
	}
	if (ext === '.ts') {
		return 'video/mp2t';
	}
	return 'application/octet-stream';
}

function toObjectKey(prefix: string, relativePath: string): string {
	const normalizedPrefix = prefix.replace(/\/+$/, '');
	const relativePosix = relativePath.split(path.sep).join('/');
	return normalizedPrefix.length > 0
		? `${normalizedPrefix}/${relativePosix}`
		: relativePosix;
}

export async function uploadDirectory(
	bucket: string,
	localRoot: string,
	keyPrefix: string,
): Promise<void> {
	const absoluteRoot = path.resolve(localRoot);
	const tasks: Array<() => Promise<void>> = [];

	for await (const fullPath of walkFiles(absoluteRoot)) {
		const relative = path.relative(absoluteRoot, fullPath);
		const key = toObjectKey(keyPrefix, relative);
		const contentType = contentTypeForArtifact(relative);

		tasks.push(async () => {
			const body = await readFile(fullPath);
			await s3.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: body,
					ContentType: contentType,
				}),
			);
		});
	}

	for (let i = 0; i < tasks.length; i += UPLOAD_CONCURRENCY) {
		const slice = tasks.slice(i, i + UPLOAD_CONCURRENCY);
		await Promise.all(slice.map((run) => run()));
	}
}
