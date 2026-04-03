import { runProcess } from '../infra/ffmpeg';

export interface VideoInfo {
	durationSeconds: number;
	width: number;
	height: number;
}

/**
 * Probes duration and source dimensions in a single ffprobe pass.
 * Uses JSON output to read both format (duration) and stream (width/height) in one call.
 */
export async function getVideoInfo(inputPath: string): Promise<VideoInfo> {
	const output = await runProcess('ffprobe', [
		'-v', 'error',
		'-select_streams', 'v:0',
		'-show_entries', 'format=duration:stream=width,height',
		'-of', 'json',
		inputPath,
	]);

	const parsed = JSON.parse(output) as {
		streams: Array<{ width?: number; height?: number }>;
		format: { duration?: string };
	};

	const stream = parsed.streams[0];
	const duration = parsed.format?.duration;

	if (!stream?.width || !stream?.height || !duration) {
		throw new Error(`ffprobe: could not read video dimensions or duration from ${inputPath}`);
	}

	return {
		durationSeconds: Math.ceil(Number(duration)),
		width: stream.width,
		height: stream.height,
	};
}
