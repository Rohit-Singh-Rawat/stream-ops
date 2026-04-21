# stream-ops — Architecture Reference

Detailed Mermaid diagrams for reference. The root README contains simplified versions.

---

## Development Environment (Docker Compose)

```mermaid
graph TD
    subgraph Browser
        UP["Upload Panel"]
        PL["HLS Player"]
    end

    subgraph Docker Network
        subgraph Services
            API["api :4000\nHono REST API"]
            WEB["web :3000\nNext.js 15"]
            WORKER["worker\nFFmpeg Transcoder"]
        end

        subgraph Storage
            MINIO["minio :9000\nMinIO (S3-compatible)"]
            MINIO_CON["minio-console :9001"]
            PG[("postgres :5432\nPostgreSQL 16")]
        end

        subgraph Messaging
            EMQ["elasticmq :9324\nElasticMQ (SQS-compatible)"]
        end

        subgraph Init
            MINIO_INIT["minio-init\ncreates buckets"]
            MIGRATE["db-migrate\nruns Drizzle migrations"]
        end
    end

    WEB -->|"SSR/RSC fetches\nvia API_BASE_URL"| API
    UP -->|"① POST /api/videos"| API
    API -->|"② presigned part URLs"| UP
    UP -->|"③ PUT multipart chunks"| MINIO
    UP -->|"④ POST /api/videos/:id/presign-upload\nPOST /api/videos/complete"| API
    API -->|"⑤ POST /api/videos/:id/queue\n→ SendMessageCommand"| EMQ
    EMQ -->|"⑥ poll (long-poll)"| WORKER
    WORKER -->|"⑦ GetObject source"| MINIO
    WORKER -->|"⑧ PutObject HLS segments\n+ master playlist + poster"| MINIO
    WORKER -->|"⑨ UPDATE videos SET status='ready'"| PG
    API -->|"read/write metadata"| PG
    PL -->|"⑩ stream HLS via presigned URL"| MINIO

    MINIO_INIT -.->|"depends on"| MINIO
    MIGRATE -.->|"depends on"| PG
    API -.->|"depends on"| MINIO_INIT
    API -.->|"depends on"| MIGRATE
    API -.->|"depends on"| EMQ
    WORKER -.->|"depends on"| MINIO_INIT
    WORKER -.->|"depends on"| MIGRATE
    WORKER -.->|"depends on"| EMQ
```

**Port summary:**

| Service | Port | Purpose |
|---------|------|---------|
| api | 4000 | REST API |
| web | 3000 | Next.js frontend |
| postgres | 5432 | Database |
| minio | 9000 | Object storage (S3-compatible) |
| minio-console | 9001 | MinIO web UI |
| elasticmq | 9324 | Message queue (SQS-compatible) |

---

## Production Environment (AWS)

```mermaid
graph TD
    Browser["Browser"]

    subgraph "AWS Region"
        subgraph "VPC"
            subgraph "Public Subnets"
                ALB_A["ALB\n(API)"]
                ALB_W["ALB\n(Web)"]
            end

            subgraph "Private Subnets"
                subgraph "ECS Cluster"
                    ECS_A["ECS Fargate\nHono API\n(auto-scaling 1–10)"]
                    ECS_W["ECS Fargate\nNext.js Web"]
                    ECS_WK["ECS Fargate\nFFmpeg Worker\n(RunTask, ephemeral 50 GiB)"]
                end

                AURORA[("Aurora Serverless v2\nPostgreSQL 15\n0.5–16 ACU")]
            end
        end

        subgraph "S3"
            S3_IN["Input Bucket\n(private)"]
            S3_OUT["Output Bucket\n(private)"]
        end

        CF["CloudFront\nCDN / HTTPS termination"]
        SQS["SQS Queue\n(S3 event notifications)"]
        LAMBDA["Lambda\nOrchestrator\n(Node.js, bundled by CDK)"]
    end

    Browser -->|"HTTPS web app"| ALB_W
    ALB_W --> ECS_W
    Browser -->|"HTTPS API calls"| ALB_A
    ALB_A --> ECS_A
    ECS_A -->|"presigned upload URLs"| S3_IN
    Browser -->|"PUT multipart chunks"| S3_IN
    S3_IN -->|"s3:ObjectCreated event\n→ SQS notification"| SQS
    SQS -->|"trigger (event source mapping)"| LAMBDA
    LAMBDA -->|"ECS RunTask\n(videoId, bucket, key env overrides)"| ECS_WK
    ECS_WK -->|"GetObject source"| S3_IN
    ECS_WK -->|"PutObject HLS segments\n+ master playlist + poster"| S3_OUT
    ECS_WK -->|"UPDATE status, renditions"| AURORA
    ECS_A <-->|"read/write metadata"| AURORA
    S3_OUT -->|"origin"| CF
    Browser -->|"stream HLS (HTTPS)"| CF
```

**CDK constructs → AWS resources:**

| Construct | Resources provisioned |
|-----------|----------------------|
| `Network` | VPC, 2 public + 2 private subnets, NAT Gateway, security groups |
| `Storage` | S3 input bucket (private), S3 output bucket (private), CloudFront distribution |
| `Database` | Aurora Serverless v2 cluster (PostgreSQL 15), secret in Secrets Manager |
| `Queue` | SQS standard queue with S3 event notification |
| `Orchestrator` | Lambda function, event source mapping from SQS, IAM role |
| `ApiService` | ECS Fargate service, ALB, task definition, auto-scaling (1–10), IAM task role |
| `Worker` | ECS Fargate task definition + IAM role (not a service — RunTask only) |
| `WebService` | ECS Fargate service, ALB, task definition, IAM task role |

**Fargate sizing defaults (editable in `infra/lib/config.ts`):**

| Service | CPU | Memory | Notes |
|---------|-----|--------|-------|
| API | 512 | 1024 MiB | scales 1–10 |
| Web | 512 | 1024 MiB | — |
| Worker | 2048 | 4096 MiB | ephemeral storage: 50 GiB (FFmpeg CPU-bound) |
| DB | 0.5–16 ACU | — | Aurora auto-scales to zero when idle |
