# worker

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Environment

| Variable | Purpose |
|----------|---------|
| `INPUT_BUCKET` | Bucket for **source** objects; worker runs `GetObject` here using the key from the queue message. |
| `OUTPUT_BUCKET` | Bucket for **transcoded** HLS (uploads after FFmpeg). |
| `QUEUE_URL` | SQS queue URL. |

Use the same `INPUT_BUCKET` / `OUTPUT_BUCKET` names as the API (`apps/api`).

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
