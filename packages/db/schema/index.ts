import { relations } from "drizzle-orm";
import {
	bigint,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const videoStatusEnum = pgEnum("video_status", [
	"created",
	"uploading",
	"uploaded",
	"queued",
	"processing",
	"ready",
	"failed",
]);

export const jobStatusEnum = pgEnum("job_status", [
	"pending",
	"running",
	"succeeded",
	"failed",
]);

export const videos = pgTable("videos", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	mimeType: text("mime_type").notNull(),
	status: videoStatusEnum("status").notNull().default("created"),

	sourceBucket: text("source_bucket"),
	sourceKey: text("source_key"),
	sourceSizeBytes: bigint("source_size_bytes", { mode: "bigint" }),

	durationSeconds: integer("duration_seconds"),
	width: integer("width"),
	height: integer("height"),

	playbackUrl: text("playback_url"),
	thumbnailVttUrl: text("thumbnail_vtt_url"),
	posterUrl: text("poster_url"),
	posterThumbUrl: text("poster_thumb_url"),

	latestJobId: uuid("latest_job_id"),

	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
});

export const videoJobs = pgTable("video_jobs", {
	id: uuid("id").primaryKey().defaultRandom(),
	videoId: uuid("video_id")
		.notNull()
		.references(() => videos.id, { onDelete: "cascade" }),

	status: jobStatusEnum("status").notNull().default("pending"),

	inputBucket: text("input_bucket").notNull(),
	inputKey: text("input_key").notNull(),
	outputPrefix: text("output_prefix").notNull(),

	attemptCount: integer("attempt_count").notNull().default(0),
	errorMessage: text("error_message"),

	startedAt: timestamp("started_at", { withTimezone: true }),
	completedAt: timestamp("completed_at", { withTimezone: true }),

	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
});

export const videoRenditions = pgTable("video_renditions", {
	id: uuid("id").primaryKey().defaultRandom(),
	videoId: uuid("video_id")
		.notNull()
		.references(() => videos.id, { onDelete: "cascade" }),
	jobId: uuid("job_id")
		.notNull()
		.references(() => videoJobs.id, { onDelete: "cascade" }),

	name: text("name").notNull(),
	// width is nullable — output width depends on source aspect ratio (scale=-2:height)
	width: integer("width"),
	height: integer("height").notNull(),
	bitrate: integer("bitrate"),

	playlistUrl: text("playlist_url").notNull(),

	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const videoThumbnails = pgTable("video_thumbnails", {
	id: uuid("id").primaryKey().defaultRandom(),
	videoId: uuid("video_id")
		.notNull()
		.references(() => videos.id, { onDelete: "cascade" }),
	jobId: uuid("job_id")
		.notNull()
		.references(() => videoJobs.id, { onDelete: "cascade" }),

	spriteUrl: text("sprite_url").notNull(),
	vttUrl: text("vtt_url").notNull(),

	intervalSeconds: integer("interval_seconds").notNull(),
	width: integer("width").notNull(),
	height: integer("height").notNull(),

	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const videosRelations = relations(videos, ({ many, one }) => ({
	jobs: many(videoJobs),
	renditions: many(videoRenditions),
	thumbnails: many(videoThumbnails),
	latestJob: one(videoJobs, {
		fields: [videos.latestJobId],
		references: [videoJobs.id],
	}),
}));

export const videoJobsRelations = relations(videoJobs, ({ one, many }) => ({
	video: one(videos, { fields: [videoJobs.videoId], references: [videos.id] }),
	renditions: many(videoRenditions),
	thumbnails: many(videoThumbnails),
}));

export const videoRenditionsRelations = relations(videoRenditions, ({ one }) => ({
	video: one(videos, { fields: [videoRenditions.videoId], references: [videos.id] }),
	job: one(videoJobs, { fields: [videoRenditions.jobId], references: [videoJobs.id] }),
}));

export const videoThumbnailsRelations = relations(videoThumbnails, ({ one }) => ({
	video: one(videos, { fields: [videoThumbnails.videoId], references: [videos.id] }),
	job: one(videoJobs, { fields: [videoThumbnails.jobId], references: [videoJobs.id] }),
}));
