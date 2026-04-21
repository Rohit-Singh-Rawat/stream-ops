# infra

AWS CDK stack for stream-ops. Provisions all production infrastructure in a single `StreamOpsStack`: networking, storage, database, messaging, and three ECS Fargate services.

## What It Provisions

| Construct | AWS Resources |
|-----------|--------------|
| `Network` | VPC, public + private subnets, NAT Gateway, security groups (api, web, worker, db) |
| `Storage` | S3 input bucket (private), S3 output bucket (private), CloudFront distribution (HTTPS, OAC) |
| `Database` | Aurora Serverless v2 (PostgreSQL 15), Secrets Manager secret for credentials |
| `Queue` | SQS standard queue, S3 event notification on the input bucket |
| `Orchestrator` | Lambda function (Node.js), SQS event source mapping, IAM execution role |
| `ApiService` | ECS Fargate service, Application Load Balancer, auto-scaling (1–10 tasks), IAM task role |
| `Worker` | ECS Fargate task definition + IAM task role (launched on-demand by the orchestrator — not a running service) |
| `WebService` | ECS Fargate service, Application Load Balancer, IAM task role |

## Deploy Guide

Deployment is a **two-pass process** because the web Docker image must be built with `NEXT_PUBLIC_API_BASE_URL` baked in as a build argument, which requires the API ALB URL — only available after the first deploy.

### Prerequisites

- AWS CLI configured with credentials for your account
- Docker running locally (CDK bundles and pushes images)
- Node.js ≥ 18 (CDK requirement)

### Pass 1 — Bootstrap + first deploy

```bash
# Bootstrap (once per AWS account/region)
npx cdk bootstrap aws://ACCOUNT_ID/REGION

# First deploy — web image is built without API URL (not yet available)
cd infra
bun install
bun run deploy
```

Wait for CloudFormation to complete, then note these stack outputs:

| Output key | Description |
|------------|-------------|
| `ApiUrl` | ALB DNS for the API (e.g. `http://stream-ops-api-alb-...elb.amazonaws.com`) |
| `AssetBaseUrl` | CloudFront URL for video assets (e.g. `https://d1234.cloudfront.net`) |

### Pass 2 — Set URLs + redeploy

Open `infra/bin/app.ts` and set:

```ts
const stack = new StreamOpsStack(app, 'StreamOpsStack', {
  apiUrl: 'http://stream-ops-api-alb-XXXX.us-east-1.elb.amazonaws.com',   // from Pass 1
  assetBaseUrl: 'https://d1234abcd.cloudfront.net',                        // from Pass 1
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
```

Then redeploy:

```bash
bun run deploy
```

The web image is now rebuilt with the correct URLs baked in.

## Configuration

All sizing is centralised in `lib/config.ts` (`defaultConfig`):

| Field | Default | Description |
|-------|---------|-------------|
| `dbMinCapacity` | `0.5` | Aurora minimum ACU (scales to near-zero when idle) |
| `dbMaxCapacity` | `16` | Aurora maximum ACU |
| `workerCpu` | `2048` | Worker task CPU units (2 vCPU) |
| `workerMemoryMiB` | `4096` | Worker task memory |
| `workerEphemeralStorageGiB` | `50` | Worker ephemeral disk (must exceed largest source + HLS output) |
| `apiCpu` | `512` | API task CPU units |
| `apiMemoryMiB` | `1024` | API task memory |
| `webCpu` | `512` | Web task CPU units |
| `webMemoryMiB` | `1024` | Web task memory |
| `apiMinCapacity` | `1` | API auto-scaling minimum tasks |
| `apiMaxCapacity` | `10` | API auto-scaling maximum tasks |

## Useful Commands

```bash
bun run deploy       # deploy / update the stack
bun run diff         # diff local changes vs deployed stack
bun run synth        # synthesise CloudFormation template (no deploy)
bun run destroy      # destroy the stack (destructive — deletes all resources)
```
