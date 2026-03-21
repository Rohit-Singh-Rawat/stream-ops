import fs from 'fs/promises';

function toTimestamp(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = (totalSeconds % 60).toFixed(3);

	const hh = String(hours).padStart(2, '0');
	const mm = String(minutes).padStart(2, '0');
	const ss = String(seconds).padStart(6, '0');

	return `${hh}:${mm}:${ss}`;
}

export async function generateVttFile(
	outputPath: string,
	spriteUrl: string,
	durationSeconds: number,
	intervalSeconds = 10,
	thumbWidth = 160,
	thumbHeight = 90,
	columns = 5,
): Promise<void> {
	let vtt = 'WEBVTT\n\n';

	let index = 0;

	for (let start = 0; start < durationSeconds; start += intervalSeconds) {
		const end = Math.min(start + intervalSeconds, durationSeconds);

		const row = Math.floor(index / columns);
		const col = index % columns;

		const x = col * thumbWidth;
		const y = row * thumbHeight;

		vtt += `${toTimestamp(start)} --> ${toTimestamp(end)}\n`;
		vtt += `${spriteUrl}#xywh=${x},${y},${thumbWidth},${thumbHeight}\n\n`;

		index++;
	}

	await fs.writeFile(outputPath, vtt, 'utf-8');
}
