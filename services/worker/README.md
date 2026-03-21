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

| Variable        | Purpose                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `INPUT_BUCKET`  | Required. Used for `{ "key" }`-only messages. S3 `Records` use **each record’s bucket** for `GetObject`. |
| `OUTPUT_BUCKET` | Bucket for **transcoded** HLS (uploads after FFmpeg).                                             |
| `QUEUE_URL`     | SQS queue URL.                                                                                    |

Use the same `INPUT_BUCKET` / `OUTPUT_BUCKET` names as the API (`apps/api`).

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
