# web

Next.js 15 App Router frontend. Provides a video library grid, a multipart chunked upload panel, and an HLS video player with custom controls.

## Features

- **Upload panel** — chunked multipart upload directly to S3 via presigned URLs. Tracks progress per chunk. Automatically enqueues transcoding when complete.
- **Video player** — custom HLS player built on the native `<video>` element. Supports quality switching, keyboard shortcuts, fullscreen, and timeline scrubbing.
- **Video library** — grid of uploaded videos with status badges (`processing`, `ready`, `failed`) and poster thumbnails.

## Environment Variables

| Variable | Where resolved | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Browser | Base URL for API calls from the client (e.g. `http://localhost:4000`) |
| `NEXT_PUBLIC_ASSET_BASE_URL` | Browser | Base URL for HLS and poster assets — S3 or CloudFront (e.g. `http://localhost:9000/stream-ops-output`) |
| `API_BASE_URL` | Server (SSR/RSC) | Overrides the base URL for server-side fetches. Required in Docker because `localhost` resolves to the web container, not the api service. Set to `http://api:4000` in `docker-compose.yml`. |

## Local Development

**With Docker (recommended):**
```bash
docker compose up -d
open http://localhost:3000
```

**Outside Docker:**
```bash
# From repo root
cp .env.local.example .env.local
bun run dev:db                     # start postgres, minio, elasticmq (api must be running separately)
bun run dev --filter=@stream-ops/web
```

## Key Internals

```
app/
  page.tsx                        — Root page (server component, renders home-page-client)
  home-page-client.tsx            — Client root: video library + upload panel
  videos/[id]/
    page.tsx                      — Video detail page
    video-page-client.tsx         — HLS player page

components/
  upload-panel.tsx                — Multipart upload UI + progress tracking
  video-player/
    index.tsx                     — Player root component
    use-video.ts                  — Video state hook (play, pause, seek, quality)
    controls-overlay.tsx          — Play/pause, volume, fullscreen controls
    progress-bar.tsx              — Timeline scrubber
    utils.ts                      — Time formatting helpers

hooks/
  use-video-library.ts            — Fetches and polls video list from API
  use-video-upload.ts             — Upload flow: initiate → chunk → complete → queue

lib/
  api.ts                          — Typed fetch wrapper for the REST API
  file-upload.ts                  — Chunked multipart upload: presign → PUT → complete
```
