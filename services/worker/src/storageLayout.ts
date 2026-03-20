import path from 'path';

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
