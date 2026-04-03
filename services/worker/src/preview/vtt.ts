import fs from 'fs/promises';
import type { PreviewSpec } from './previewPolicy';

function toTimestamp(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const secs = totalSeconds % 60;
	const hh = String(hours).padStart(2, '0');
	const mm = String(minutes).padStart(2, '0');
	const ss = secs.toFixed(3).padStart(6, '0'); // "9.500" → "09.500"
	return `${hh}:${mm}:${ss}`;
}

// spriteRelativeUrls: one filename per page e.g. ["sprite_lq_0.jpg", "sprite_lq_1.jpg"]
// Relative paths are intentional — parseVtt resolves them against the VTT's CDN URL.
export async function generateVttFile(
	outputPath: string,
	spriteRelativeUrls: string[],
	spec: PreviewSpec,
	tier: 'lq' | 'hq',
	durationSeconds: number,
): Promise<void> {
	const tierSpec = spec[tier];
	let vtt = 'WEBVTT\n\n';

	for (let i = 0; i < spec.totalCues; i++) {
		const start = i * spec.intervalSeconds;
		const end = Math.min(start + spec.intervalSeconds, durationSeconds);

		const pageIndex = Math.floor(i / tierSpec.cellsPerPage);
		const localIndex = i % tierSpec.cellsPerPage;
		const col = localIndex % tierSpec.columns;
		const row = Math.floor(localIndex / tierSpec.columns);

		const x = col * tierSpec.cellWidth;
		const y = row * tierSpec.cellHeight;

		vtt += `${toTimestamp(start)} --> ${toTimestamp(end)}\n`;
		vtt += `${spriteRelativeUrls[pageIndex]}#xywh=${x},${y},${tierSpec.cellWidth},${tierSpec.cellHeight}\n\n`;
	}

	await fs.writeFile(outputPath, vtt, 'utf-8');
}
