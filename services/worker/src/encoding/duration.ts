import { spawn } from 'child_process';

export function getVideoDuration(inputPath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const args = [
			'-v',
			'error',
			'-show_entries',
			'format=duration',
			'-of',
			'default=noprint_wrappers=1:nokey=1',
			inputPath,
		];

		const child = spawn('ffprobe', args);

		let output = '';

		child.stdout.on('data', (data) => {
			output += data.toString();
		});

		child.stderr.on('data', (data) => {
			console.error(data.toString());
		});

		child.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`ffprobe failed with code ${code}`));
				return;
			}

			resolve(Math.ceil(Number(output.trim())));
		});
	});
}
