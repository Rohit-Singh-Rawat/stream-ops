CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('created', 'uploading', 'uploaded', 'queued', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "video_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"input_bucket" text NOT NULL,
	"input_key" text NOT NULL,
	"output_prefix" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_renditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"name" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bitrate" integer,
	"playlist_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_thumbnails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"sprite_url" text NOT NULL,
	"vtt_url" text NOT NULL,
	"interval_seconds" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "video_status" DEFAULT 'created' NOT NULL,
	"source_bucket" text,
	"source_key" text,
	"source_size_bytes" bigint,
	"duration_seconds" integer,
	"width" integer,
	"height" integer,
	"playback_url" text,
	"thumbnail_vtt_url" text,
	"latest_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_renditions" ADD CONSTRAINT "video_renditions_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_renditions" ADD CONSTRAINT "video_renditions_job_id_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."video_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_thumbnails" ADD CONSTRAINT "video_thumbnails_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_thumbnails" ADD CONSTRAINT "video_thumbnails_job_id_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."video_jobs"("id") ON DELETE cascade ON UPDATE no action;