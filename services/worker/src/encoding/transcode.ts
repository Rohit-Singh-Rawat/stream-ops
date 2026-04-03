import { spawnSync } from 'child_process';
import { runProcess } from '../infra/ffmpeg';

export interface EncodingRendition {
	name: string;
	height: number;
	bitrate: number;
	/** 0-based stream index in the HLS multi-variant output (%v in ffmpeg segment pattern) */
	index: number;
}

type LadderRung = {
	readonly name: string;
	readonly height: number;
	readonly bitrate: number;
	readonly maxrate: number;
	readonly bufsize: number;
};

// Ordered highest to lowest — filter preserves this order so the master manifest
// lists the highest quality rendition first (expected by most HLS players).
const ENCODING_LADDER: readonly LadderRung[] = [
	{ name: '1080p', height: 1080, bitrate: 5000, maxrate: 5350, bufsize: 7500 },
	{ name: '720p',  height: 720,  bitrate: 2800, maxrate: 3000, bufsize: 4200 },
	{ name: '480p',  height: 480,  bitrate: 1400, maxrate: 1500, bufsize: 2100 },
	{ name: '360p',  height: 360,  bitrate: 800,  maxrate: 860,  bufsize: 1200 },
];

// Always returns at least the lowest rung to handle sub-360p inputs.
function getEncodingLadder(inputHeight: number): readonly LadderRung[] {
	const filtered = ENCODING_LADDER.filter((r) => r.height <= inputHeight);
	return filtered.length > 0 ? filtered : [ENCODING_LADDER[ENCODING_LADDER.length - 1]!];
}

// When there is only one rendition, skip the split filter entirely (simpler graph).
// With multiple renditions, split=N creates N copies of the decoded stream so each
// scale filter gets its own branch — required for correctness in filter_complex.
function buildFilterComplex(ladder: readonly LadderRung[]): string {
	if (ladder.length === 1) {
		return `[0:v]scale=-2:${ladder[0]!.height}[v0]`;
	}
	const split = `[0:v]split=${ladder.length}${ladder.map((_, i) => `[s${i}]`).join('')}`;
	const scales = ladder.map((r, i) => `[s${i}]scale=-2:${r.height}[v${i}]`);
	return [split, ...scales].join(';');
}

export async function runFFmpeg(
	inputPath: string,
	outputDir: string,
	inputHeight: number,
): Promise<EncodingRendition[]> {
	const hasAudio = inputHasAudioStream(inputPath);
	const ladder = getEncodingLadder(inputHeight);

	// One -map block per rendition: video stream from filter graph + source audio (if present).
	// -c:v:i, -b:v:i, -maxrate:v:i, -bufsize:v:i apply per output stream index.
	// maxrate ~7% above target + bufsize 1.5× target = standard VBV config for smooth rate control.
	const perStreamArgs = ladder.flatMap((r, i) => [
		'-map', `[v${i}]`,
		...(hasAudio ? ['-map', '0:a:0'] : []),
		`-c:v:${i}`, 'libx264',
		`-b:v:${i}`, `${r.bitrate}k`,
		`-maxrate:v:${i}`, `${r.maxrate}k`,
		`-bufsize:v:${i}`, `${r.bufsize}k`,
	]);

	// v:i,a:i pairs tell ffmpeg which video and audio stream belong to each HLS variant.
	const varStreamMap = ladder
		.map((_, i) => (hasAudio ? `v:${i},a:${i}` : `v:${i}`))
		.join(' ');

	const args = [
		'-y',
		'-i', inputPath,
		'-filter_complex', buildFilterComplex(ladder),
		...perStreamArgs,
		'-preset', 'veryfast',        // encoding speed vs. compression tradeoff
		'-profile:v', 'main',         // H.264 Main profile — broad device compatibility
		'-sc_threshold', '0',         // disable x264 scenecut — keeps GOP boundaries predictable for HLS
		'-g', '48',                   // GOP size: keyframe every 48 frames (2s at 24fps)
		'-keyint_min', '48',          // enforce minimum distance between keyframes
		...(hasAudio ? ['-c:a', 'aac', '-b:a', '128k'] : []),
		'-f', 'hls',
		'-hls_time', '6',             // target segment duration in seconds
		'-hls_playlist_type', 'vod',  // write #EXT-X-ENDLIST — signals complete file to players
		'-hls_flags', 'independent_segments', // each segment starts with an IDR frame
		'-hls_segment_filename', `${outputDir}/%v/segment_%03d.ts`, // %v = variant stream index
		'-master_pl_name', 'master.m3u8',
		'-var_stream_map', varStreamMap,
		`${outputDir}/%v/prog.m3u8`,  // per-variant media playlist
	];

	await runProcess('ffmpeg', args);

	return ladder.map((r, i) => ({
		name: r.name,
		height: r.height,
		bitrate: r.bitrate,
		index: i,
	}));
}

function inputHasAudioStream(inputPath: string): boolean {
	const probe = spawnSync(
		'ffprobe',
		[
			'-v', 'error',
			'-select_streams', 'a:0',
			'-show_entries', 'stream=codec_type',
			'-of', 'default=noprint_wrappers=1:nokey=1',
			inputPath,
		],
		{ encoding: 'utf8' },
	);
	return probe.status === 0 && probe.stdout.trim().length > 0;
}
