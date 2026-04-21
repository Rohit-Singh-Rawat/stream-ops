# @stream-ops/types

Shared TypeScript types used by `apps/api`, `apps/web`, and `services/worker`. No runtime code — types only.

## Key Types

| Type | Description |
|------|-------------|
| `VideoStatus` | Union: `"created" \| "uploading" \| "uploaded" \| "queued" \| "processing" \| "ready" \| "failed"` |
| `VideoSummary` | Video record shape returned by the API list/detail endpoints |
| `VideoRendition` | HLS rendition: `name`, `height`, `bitrate` |
| `VideoCollectionSummary` | Aggregate counts: `total`, `ready`, `processing`, `failed` |
| `ListVideosResponse` | `{ videos: VideoSummary[], summary: VideoCollectionSummary }` |
| `GetVideoResponse` | `{ video: VideoSummary, renditions: VideoRendition[] }` |

## Usage

```ts
import type { VideoSummary, VideoStatus, GetVideoResponse } from '@stream-ops/types'
```

No `DATABASE_URL` or runtime dependencies required.
