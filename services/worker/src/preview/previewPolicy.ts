
export interface TierSpec {
	readonly columns: number;
	readonly rows: number;
	readonly cellWidth: number;
	readonly cellHeight: number;
	readonly cellsPerPage: number;
	readonly pageCount: number;
	readonly jpegQuality: number;
}

export interface PreviewSpec {
	readonly intervalSeconds: number;
	readonly totalCues: number;
	readonly lq: TierSpec;
	readonly hq: TierSpec;
}

const INTERVAL_MIN_SEC = 2;
const INTERVAL_MAX_SEC = 60;

const LQ_COLUMNS = 10;
const LQ_ROWS = 10;
const LQ_CELL_W = 80;
const LQ_CELL_H = 45;
const LQ_JPEG_QUALITY = 8; // ffmpeg -q:v scale: higher = more compression

const HQ_COLUMNS = 5;
const HQ_ROWS = 5;
const HQ_CELL_W = 160;
const HQ_CELL_H = 90;
const HQ_JPEG_QUALITY = 3;

// Targets ~30 cues; clamped: <60s video → 2s interval, >30min → 60s interval
export function computePreviewSpec(durationSeconds: number): PreviewSpec {
	const rawInterval = durationSeconds / 30;
	const intervalSeconds = Math.max(INTERVAL_MIN_SEC, Math.min(INTERVAL_MAX_SEC, rawInterval));

	const totalCues = Math.max(1, Math.ceil(durationSeconds / intervalSeconds));

	const lqCellsPerPage = LQ_COLUMNS * LQ_ROWS;
	const hqCellsPerPage = HQ_COLUMNS * HQ_ROWS;

	return {
		intervalSeconds,
		totalCues,
		lq: {
			columns: LQ_COLUMNS,
			rows: LQ_ROWS,
			cellWidth: LQ_CELL_W,
			cellHeight: LQ_CELL_H,
			cellsPerPage: lqCellsPerPage,
			pageCount: Math.ceil(totalCues / lqCellsPerPage),
			jpegQuality: LQ_JPEG_QUALITY,
		},
		hq: {
			columns: HQ_COLUMNS,
			rows: HQ_ROWS,
			cellWidth: HQ_CELL_W,
			cellHeight: HQ_CELL_H,
			cellsPerPage: hqCellsPerPage,
			pageCount: Math.ceil(totalCues / hqCellsPerPage),
			jpegQuality: HQ_JPEG_QUALITY,
		},
	};
}
