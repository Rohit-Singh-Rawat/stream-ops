import { spawn } from 'child_process';

// ffmpeg works in pipelines, each video stream is a separate pipeline

/**
 * Transcodes `inputPath` to a 3-rendition HLS VOD package under `outputDir`
 * (1080p / 720p / 480p video, AAC audio, master.m3u8 + per-rendition playlists and .ts segments).
 */
export function runFFmpeg(inputPath: string, outputDir: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			'-y', // overwrite existing outputs

			'-i',
			inputPath,

			// split input video to 3 streams; scale to 1080p / 720p / 480p
			'-filter_complex',
			[
				'[0:v]split=3[v1][v2][v3]',
				'[v1]scale=w=1920:h=1080[v1out]',
				'[v2]scale=w=1280:h=720[v2out]',
				'[v3]scale=w=854:h=480[v3out]',
			].join(';'),

			// stream 0: 1080p libx264 + optional input audio
			'-map',
			'[v1out]', // map the 1080p scaled video stream
			'-map',
			'0:a?', // map audio from input (optional, ? means no error if missing)
			'-c:v:0',
			'libx264', // use H.264 codec for first video stream
			'-b:v:0',
			'5000k', // target bitrate: 5 Mbps for 1080p
			'-maxrate:v:0',
			'5350k', // max bitrate cap (allows ~7% headroom for VBV)
			'-bufsize:v:0',
			'7500k', // VBV buffer size (1.5x target for smooth rate control)

			// stream 1: 720p libx264 + optional input audio
			'-map',
			'[v2out]',
			'-map',
			'0:a?',
			'-c:v:1',
			'libx264',
			'-b:v:1',
			'2800k',
			'-maxrate:v:1',
			'3000k',
			'-bufsize:v:1',
			'4200k',

			// stream 2: 480p libx264 + optional input audio
			'-map',
			'[v3out]',
			'-map',
			'0:a?',
			'-c:v:2',
			'libx264',
			'-b:v:2',
			'1400k',
			'-maxrate:v:2',
			'1500k',
			'-bufsize:v:2',
			'2100k',

			// x264 options apply to all video outputs
			'-preset',
			'veryfast',
			'-profile:v',
			'main',
			'-sc_threshold',
			'0', // disable x264 scenecut keyframes

			'-g',
			'48', // GOP size / max keyframe interval (frames)
			'-keyint_min',
			'48',

			// audio: one mapped stream per output variant (same source, repeated -map)
			'-c:a',
			'aac',
			'-b:a',
			'128k',

			'-f',
			'hls',
			'-hls_time',
			'6', // segment duration (seconds)
			'-hls_playlist_type',
			'vod',

			'-hls_flags',
			'independent_segments', // require IDR at segment start

			'-hls_segment_filename',
			`${outputDir}/%v/segment_%03d.ts`, // %v = variant index

			'-master_pl_name',
			'master.m3u8',

			'-var_stream_map',
			'v:0,a:0 v:1,a:1 v:2,a:2', // pair nth video with nth audio in mux

			`${outputDir}/%v/prog.m3u8`, // variant media playlists
		];

		const ff = spawn('ffmpeg', args);

		ff.stderr.on('data', (data) => {
			console.log(data.toString());
		});

		ff.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`FFmpeg failed with code ${code}`));
		});
	});
}
