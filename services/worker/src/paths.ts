import path from 'path';

export function outputKeyPrefixForTranscode(objectKey: string, videoId: string): string {
	const normalized = objectKey.replace(/\\/g, '/');
	const parent = path.posix.dirname(normalized);
	if (parent === '.' || parent === '') {
		return `hls/${videoId}`;
	}
	return `${parent}/hls`;
}

export function thumbnailKeyPrefix(objectKey: string, videoId: string): string {
	const normalized = objectKey.replace(/\\/g, '/');
	const parent = path.posix.dirname(normalized);
	if (parent === '.' || parent === '') {
		return `videos/${videoId}/thumbnails`;
	}
	return `${parent}/thumbnails`;
}

export function webPathForThumbnailSprite(objectKey: string, videoId: string): string {
	const normalized = objectKey.replace(/\\/g, '/');
	const parent = path.posix.dirname(normalized);
	if (parent === '.' || parent === '') {
		return `/videos/${videoId}/thumbnails/sprite.jpg`;
	}
	return `/${parent}/thumbnails/sprite.jpg`;
}
