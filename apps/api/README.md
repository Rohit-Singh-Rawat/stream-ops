# api

Hono REST API. Coordinates multipart video uploads via presigned S3 URLs, stores video metadata in PostgreSQL via Drizzle ORM, and dispatches transcoding jobs to SQS (local) or via S3 event notifications (production).

## API Reference

All routes are prefixed with `/api/videos`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/videos` | List all videos. Optional `?limit=N` (1–100). |
| `POST` | `/api/videos` | Create a video record. Body: `{ name, size, type }` |
| `GET` | `/api/videos/:id` | Get a video by ID with its renditions. |
| `POST` | `/api/videos/:id/presign-upload` | Generate presigned S3 URLs for a multipart upload part. |
| `POST` | `/api/videos/:id/queue` | Enqueue the video for transcoding (local dev only). |
| `POST` | `/api/videos/complete` | Complete a multipart upload. Body: `{ key, uploadId }` |
| `POST` | `/api/videos/abort` | Abort a multipart upload. Body: `{ key, uploadId }` |
| `DELETE` | `/api/videos` | Delete all video records (dev utility). |

Accepted video MIME types: `video/mp4`, `video/webm`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AWS_REGION` | Yes | AWS region (e.g. `us-east-1`) |
| `INPUT_BUCKET` | Yes | S3 bucket for raw uploads |
| `OUTPUT_BUCKET` | Yes | S3 bucket for HLS output |
| `AWS_ACCESS_KEY_ID` | No | Explicit credentials — omit in production (IAM task role used instead) |
| `AWS_SECRET_ACCESS_KEY` | No | Explicit credentials — omit in production |
| `AWS_ENDPOINT_URL` | No | Custom S3 endpoint (MinIO in local dev: `http://localhost:9000`) |
| `AWS_PRESIGN_ENDPOINT_URL` | No | Browser-reachable S3 endpoint for presigned URLs. Required in Docker dev because `AWS_ENDPOINT_URL` uses internal hostnames the browser can't reach. |
| `QUEUE_URL` | No | SQS / ElasticMQ URL for job dispatch. Not set in production — S3 event notifications trigger the Lambda orchestrator instead. |
| `PORT` | No | Listen port. Default: `4000` |

Copy `.env.local.example` from the repo root for local development values.

## Local Development

**With Docker (recommended):**
```bash
docker compose up -d
```
The api container starts on port `4000` with all dependencies wired automatically.

**Outside Docker (hot-reload):**
```bash
# From repo root
cp .env.local.example .env.local   # fill in values if needed — defaults match docker-compose
bun run dev:db                     # start postgres, minio, elasticmq
bun run dev --filter=@stream-ops/api
```

## Key Internals

```
src/
  modules/videos/
    videos.routes.ts       — Hono route definitions
    videos.controller.ts   — Request validation (Zod) + handler wiring
    videos.service.ts      — Business logic: S3 ops, DB writes, SQS dispatch
  shared/
    hono-factory.ts        — Typed Hono app factory
    zod-validator.ts       — Middleware: validate + narrow request types
  config/
    env.ts                 — Zod-parsed, typed environment variables
    sqs.ts                 — SQS client + sendTranscodeJob helper
  utils/
    logger.ts              — Structured logger wrapper
```

Body size limit: 1 MB (Hono `bodyLimit` middleware). CORS is permissive in development and origin-echoing in production.
