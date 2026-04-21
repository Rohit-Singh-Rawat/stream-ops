# worker

Long-running SQS consumer and FFmpeg transcoding pipeline. Polls a queue for jobs, downloads the source video from S3, transcodes it into adaptive HLS, generates a poster thumbnail, uploads the output back to S3, and updates the database.

## Pipeline

Each job runs these stages in sequence:

```
1. Dequeue        Poll SQS / ElasticMQ for a job message
2. Download       GetObject source file from S3 input bucket → temp file
3. Transcode      FFmpeg → HLS segments at 1080p / 720p / 480p + master playlist
4. Poster         FFmpeg → extract frame at 10 % → JPEG poster + thumbnail + sprite sheet + WebVTT for timeline preview
5. Upload         PutObject HLS files + poster + thumbnail → S3 output bucket
6. Update DB      UPDATE videos SET status='ready', poster_url, renditions
7. Delete job     Delete SQS message on success (or leave for retry on failure)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AWS_REGION` | Yes | AWS region |
| `INPUT_BUCKET` | Yes | S3 bucket with source uploads |
| `OUTPUT_BUCKET` | Yes | S3 bucket for HLS output |
| `AWS_ACCESS_KEY_ID` | No | Explicit credentials — omit in production (IAM task role) |
| `AWS_SECRET_ACCESS_KEY` | No | Explicit credentials — omit in production |
| `AWS_ENDPOINT_URL` | No | Custom S3 endpoint (MinIO: `http://minio:9000` inside Docker) |
| `QUEUE_URL` | Yes (local) | SQS / ElasticMQ URL. Set locally; in production the worker is launched as a one-shot ECS task so no queue polling is needed. |

## Local Development

The worker runs as a Docker Compose service. It uses `index.local.ts` as the entry point (polls ElasticMQ in a loop):

```bash
docker compose up -d worker
docker compose logs -f worker
```

The production entry point (`index.ts`) is invoked by the ECS task launcher — it processes a single job passed via environment variables, then exits.

## Key Internals

```
src/
  pipeline/           — HLS encoding: segment, playlist generation
  preview/            — Poster and thumbnail extraction (FFmpeg)
  encoding/           — FFmpeg process wrapper and output parsing
  db/                 — (reserved) DB update logic lives in processor.ts
  infra/              — S3 download / upload helpers
  paths.ts            — S3 key conventions (input key → output prefix)
  processor.ts        — Orchestrates one full job end-to-end

index.local.ts        — Entry point for local dev: polls ElasticMQ in a loop
index.ts              — Entry point for production: single-job ECS task
```

FFmpeg must be installed and on `PATH`. The Docker image bundles a static FFmpeg binary.
