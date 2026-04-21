# orchestrator

AWS Lambda function. Bridges S3 upload events to ECS Fargate worker tasks in production. When a video is uploaded to the S3 input bucket, S3 emits an event notification to SQS, which triggers this Lambda. The Lambda reads the S3 key, derives the video ID, and calls `ECS RunTask` to spin up a one-shot worker container.

## How it fits in the production flow

```
Browser
  └─► PUT chunks → S3 input bucket
                     └─► S3 event notification → SQS
                                                   └─► Lambda (this package)
                                                         └─► ECS RunTask (worker Fargate task)
                                                               └─► download → transcode → upload → update DB
```

This package is **not used in local development**. Locally, the API sends a job directly to ElasticMQ and the worker polls it in a loop.

## Environment Variables

Set as Lambda environment variables by the CDK `Orchestrator` construct:

| Variable | Description |
|----------|-------------|
| `AWS_REGION` | AWS region |
| `ECS_CLUSTER` | ARN or name of the ECS cluster |
| `TASK_DEF` | ARN of the ECS task definition for the worker |
| `SUBNETS` | Comma-separated subnet IDs for the Fargate task network config |
| `SECURITY_GROUPS` | Comma-separated security group IDs |
| `CONTAINER_NAME` | Container name inside the task definition. Default: `video-transcoder` |

## Build and Deploy

The CDK construct bundles and deploys this Lambda automatically. To build the zip manually:

```bash
cd apps/orchestrator
bun run build    # compiles to dist/index.js (CJS, Node.js target)
bun run zip      # produces dist/lambda.zip
```

## Key Internals

```
src/
  handler.ts    — Lambda entry point. Parses SQS event → S3 records → calls runTask per record.
  ecs.ts        — ECS RunTask wrapper. Reads cluster / task-def / network config from env.
```

Key logic in `handler.ts`:
- Iterates SQS records; each body is a JSON-encoded S3 event
- Extracts `bucket.name` and `object.key` from each S3 record
- Derives `videoId` from the S3 key path (second-to-last path segment)
- Calls `runTask({ videoId, bucket, key })` for each record

Key logic in `ecs.ts`:
- Constructs a `RunTaskCommand` with `FARGATE` launch type and `awsvpcConfiguration`
- Passes `videoId`, `bucket`, `key` as container environment variable overrides on the `video-transcoder` container
