import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export async function extractThumbnails(inputPath: string, outputDir: string): Promise<void> {
	await fs.mkdir(outputDir, { recursive: true });

	const args = [
		'-i',
		inputPath,
		'-vf',
		'fps=1/10,scale=160:90',
		'-q:v',
		'2',
		path.join(outputDir, 'thumb_%03d.jpg'),
	];

	await run('ffmpeg', args);
}

function run(cmd: string, args: string[]) {
	return new Promise<void>((resolve, reject) => {
		const child = spawn(cmd, args);

		child.stderr.on('data', (d) => {
			console.log(d.toString());
		});

		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} failed with code ${code}`));
		});
	});
}
export async function generateSprite(inputPath: string, outputPath: string): Promise<void> {
	const args = [
		'-i',
		inputPath,
		'-vf',
		'fps=1/10,scale=160:90,tile=5x5',
		'-q:v',
		'2',
		'-frames:v',
		'1',
		outputPath,
	];

	await run('ffmpeg', args);
}
