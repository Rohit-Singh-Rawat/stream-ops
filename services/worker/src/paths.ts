import path from 'path';

/**
 * HLS output prefix: mirrors the source key’s folder layout so uploads stay next to the original object.
 */
export function outputKeyPrefixForTranscode(objectKey: string, videoId: string): string {
	const normalized = objectKey.replace(/\\/g, '/');
	const parent = path.posix.dirname(normalized);
	if (parent === '.' || parent === '') {
		return `hls/${videoId}`;
	}
	return `${parent}/hls`;
}

/**
 * Thumbnail artifacts (sprite + VTT) use the same folder relationship as HLS, under a `thumbnails` segment.
 */
export function thumbnailKeyPrefix(objectKey: string, videoId: string): string {
	const normalized = objectKey.replace(/\\/g, '/');
	const parent = path.posix.dirname(normalized);
	if (parent === '.' || parent === '') {
		return `videos/${videoId}/thumbnails`;
	}
	return `${parent}/thumbnails`;
}

/**
 * WEBVTT references the sprite by URL path; this must match how the app/CDN maps S3 keys to HTTP paths
 * (same structure as {@link thumbnailKeyPrefix} + `/sprite.jpg`).
 */
export function webPathForThumbnailSprite(objectKey: string, videoId: string): string {
	const normalized = objectKey.replace(/\\/g, '/');
	const parent = path.posix.dirname(normalized);
	if (parent === '.' || parent === '') {
		return `/videos/${videoId}/thumbnails/sprite.jpg`;
	}
	return `/${parent}/thumbnails/sprite.jpg`;
}

const MAX_SEGMENT_LEN = 200;

export function jobWorkspaceDirName(objectKey: string): string {
	const normalized = objectKey.replace(/\\/g, '/').replace(/^\/+/, '');
	const segments = normalized.split('/').filter(Boolean);
	const fileName = segments.at(-1) ?? 'object';

	if (segments.length >= 2) {
		const parent = segments[segments.length - 2];
		if (parent) {
			return sanitizeDirSegment(parent);
		}
	}

	const base = path.posix.basename(fileName, path.posix.extname(fileName));
	return sanitizeDirSegment(base || 'job');
}

function sanitizeDirSegment(name: string): string {
	const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
	const trimmed = cleaned.slice(0, MAX_SEGMENT_LEN);
	return trimmed.length > 0 ? trimmed : 'job';
}
