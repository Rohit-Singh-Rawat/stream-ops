import fs from 'fs/promises';
import path from 'path';
import { runProcess } from '../infra/ffmpeg';
import type { PreviewSpec } from './previewPolicy';

export async function extractFrames(
	inputPath: string,
	framesDir: string,
	spec: PreviewSpec
): Promise<void> {
	await fs.mkdir(framesDir, { recursive: true });

	const args = [
		'-y',
		'-i',
		inputPath,
		'-vf',
		`fps=1/${spec.intervalSeconds},scale=${spec.hq.cellWidth}:${spec.hq.cellHeight}`,
		'-q:v',
		String(spec.hq.jpegQuality),
		path.join(framesDir, 'frame_%04d.jpg'),
	];

	await runProcess('ffmpeg', args);
}

export async function generateSpritePage(
	framesDir: string,
	pageIndex: number,
	tier: 'lq' | 'hq',
	spec: PreviewSpec,
	outputPath: string
): Promise<void> {
	const tierSpec = spec[tier];
	const startFrame = pageIndex * tierSpec.cellsPerPage + 1;
	const framesOnPage = Math.min(
		tierSpec.cellsPerPage,
		spec.totalCues - pageIndex * tierSpec.cellsPerPage
	);

	const vfFilter =
		tier === 'lq'
			? `scale=${tierSpec.cellWidth}:${tierSpec.cellHeight},tile=${tierSpec.columns}x${tierSpec.rows}`
			: `tile=${tierSpec.columns}x${tierSpec.rows}`;

	// -f image2 + -framerate 1 + -t framesOnPage limits INPUT frames read before tiling.
	// Without this, -frames:v on the output side waits for N complete tile grids (N * cellsPerPage
	// input frames), exhausting the sequence and triggering AVERROR(EINVAL) -> exit code 234.
	const args = [
		'-y',
		'-f',
		'image2',
		'-framerate',
		'1',
		'-start_number',
		String(startFrame),
		'-t',
		String(framesOnPage),
		'-i',
		path.join(framesDir, 'frame_%04d.jpg'),
		'-vf',
		vfFilter,
		'-q:v',
		String(tierSpec.jpegQuality),
		'-frames:v',
		'1',
		outputPath,
	];

	await runProcess('ffmpeg', args);
}
