import fs from 'fs/promises';
import path from 'path';
import { runProcess } from '../infra/ffmpeg';

export interface PosterOutput {
	posterPath: string;
	posterThumbPath: string;
}

export async function generatePosters(
	inputPath: string,
	outputDir: string,
	durationSeconds: number,
): Promise<PosterOutput> {
	await fs.mkdir(outputDir, { recursive: true });

	const posterPath = path.join(outputDir, 'poster.jpg');
	const posterThumbPath = path.join(outputDir, 'poster_thumb.jpg');

	// Seek to 10% of duration (clamped 1s-30s) to avoid black intro frames
	const offsetSeconds = Math.min(Math.max(durationSeconds * 0.1, 1), 30);

	// scale=-2 preserves aspect ratio and ensures width is divisible by 2
	const filterComplex = '[0:v]split=2[full][thumb];[full]scale=1280:-2[out1];[thumb]scale=320:-2[out2]';

	const args = [
		'-y',
		'-ss', String(offsetSeconds),
		'-i', inputPath,
		'-filter_complex', filterComplex,
		'-map', '[out1]', '-frames:v', '1', '-q:v', '3', posterPath,
		'-map', '[out2]', '-frames:v', '1', '-q:v', '5', posterThumbPath,
	];

	await runProcess('ffmpeg', args);

	return { posterPath, posterThumbPath };
}
