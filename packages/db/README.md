# @stream-ops/db

Drizzle ORM schema and database client. Shared by `apps/api` and `services/worker`.

## Usage

```ts
import { db } from '@stream-ops/db'
import { videos } from '@stream-ops/db/schema'

const allVideos = await db.select().from(videos)
```

Requires `DATABASE_URL` **or** the `DB_HOST` + `DB_USER` + `DB_PASS` triple to be set before the module is imported. In production ECS, Secrets Manager injects individual credentials (`DB_HOST`, `DB_USER`, `DB_PASS`, optionally `DB_PORT` / `DB_NAME`). Locally, set `DATABASE_URL`.

## Schema

The schema lives in `schema/`. Tables:

| Table | Purpose |
|-------|---------|
| `videos` | Video records: id, name, MIME type, status, poster/playback URLs, timestamps |
| `videoJobs` | Transcoding job records: status, input/output paths, attempt count, error message |
| `videoRenditions` | HLS rendition metadata per job: name, height, width, bitrate, playlist URL |
| `videoThumbnails` | Sprite sheet + WebVTT thumbnail data per job: spriteUrl, vttUrl, interval, dimensions |

## Scripts

Run from this package directory (`packages/db`) or via `turbo` filter from the root:

| Script | Command | What it does |
|--------|---------|-------------|
| `db:generate` | `drizzle-kit generate` | Generate a SQL migration from schema changes |
| `db:migrate` | `drizzle-kit migrate` | Apply pending migrations to the database |
| `db:push` | `drizzle-kit push` | Push schema directly to DB (dev only, no migration file) |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio (visual DB browser) |

```bash
# From repo root
bun run --filter=@stream-ops/db db:migrate
```
