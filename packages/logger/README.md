# @stream-ops/logger

Minimal structured JSON logger shared by `apps/api`, `apps/orchestrator`, and `services/worker`. Emits one JSON line per call to stdout — compatible with CloudWatch Logs Insights.

## Usage

```ts
import { log } from '@stream-ops/logger'

log({ stage: 'transcode_start', videoId: 'abc-123', bucket: 'stream-ops-input' })
// → {"timestamp":"2026-04-21T10:00:00.000Z","stage":"transcode_start","videoId":"abc-123","bucket":"stream-ops-input"}
```

The `stage` field is required. All other fields are passed through as-is.

## API

```ts
type LogFields = { stage: string } & Record<string, unknown>

function log(fields: LogFields): void
```

Output format: `JSON.stringify({ timestamp: <ISO string>, ...fields })` written to `console.log`.
