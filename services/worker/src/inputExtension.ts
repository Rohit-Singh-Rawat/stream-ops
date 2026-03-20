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

export function resolveVideoInputExtension(key: string, contentType?: string | null): string {
	console.log(`Resolving video input extension for key: ${key}, contentType: ${contentType}`);
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
