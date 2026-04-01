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
