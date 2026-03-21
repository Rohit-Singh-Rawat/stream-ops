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

const ALLOWED_EXTENSIONS = new Set([
	'.mp4',
	'.m4v',
	'.mov',
	'.mkv',
	'.webm',
	'.avi',
	'.mpeg',
	'.mpg',
	'.m2ts',
	'.ts',
]);

const CONTENT_TYPE_TO_EXT: Readonly<Record<string, string>> = {
	'video/mp4': '.mp4',
	'video/quicktime': '.mov',
	'video/x-matroska': '.mkv',
	'video/webm': '.webm',
	'video/x-msvideo': '.avi',
	'video/mpeg': '.mpeg',
	'application/mp4': '.mp4',
};

function resolveVideoInputExtension(key: string, contentType?: string | null): string {
	const fromKey = extensionFromKeyBasename(key);
	if (fromKey && ALLOWED_EXTENSIONS.has(fromKey)) {
		return fromKey;
	}

	const normalizedType = contentType?.split(';')[0]?.trim().toLowerCase();
	if (normalizedType) {
		const fromType = CONTENT_TYPE_TO_EXT[normalizedType];
		if (fromType) {
			return fromType;
		}
	}

	throw new Error(
		[
			'Cannot infer container extension for transcode input.',
			`Key suffix must be one of: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
			`or S3 Content-Type must be mapped (got: ${contentType ?? 'none'}).`,
		].join(' '),
	);
}

function extensionFromKeyBasename(key: string): string | null {
	const base = key.split('/').filter(Boolean).pop() ?? '';
	const dot = base.lastIndexOf('.');
	if (dot <= 0 || dot === base.length - 1) {
		return null;
	}
	return `.${base.slice(dot + 1).toLowerCase()}`;
}

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

export async function uploadFile(
	bucket: string,
	localPath: string,
	key: string,
	contentType: string,
): Promise<void> {
	const body = await readFile(localPath);
	await s3.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
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
