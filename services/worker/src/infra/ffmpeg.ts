import { spawn } from 'child_process';

/**
 * Runs an ffmpeg or ffprobe command and resolves on success.
 * On failure, rejects with the last 10 lines of stderr included in the message
 * so log({ stage, error }) carries actionable context instead of just an exit code.
 */
export function runProcess(bin: 'ffmpeg' | 'ffprobe', args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(bin, args);

		const stderrChunks: Buffer[] = [];
		const stdoutChunks: Buffer[] = [];

		child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

		child.on('close', (code) => {
			const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
			if (code === 0) {
				resolve(stdout);
				return;
			}
			const stderr = Buffer.concat(stderrChunks).toString('utf-8');
			const tail = stderr.split('\n').slice(-10).join('\n').trim();
			reject(new Error(`${bin} exited with code ${code}\n${tail}`));
		});
	});
}
