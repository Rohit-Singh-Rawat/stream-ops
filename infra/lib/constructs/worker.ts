import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import { Construct } from 'constructs';

export interface WorkerProps {
  readonly vpc: ec2.Vpc;
  readonly securityGroup: ec2.SecurityGroup;
  readonly inputBucket: s3.Bucket;
  readonly outputBucket: s3.Bucket;
  readonly dbSecret: secretsmanager.ISecret;
  readonly dbProxyEndpoint: string;
  readonly cpu: number;
  readonly memoryMiB: number;
  readonly ephemeralStorageGiB: number;
  readonly repoRoot: string;
}

export class Worker extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  /** Passed to ECS RunTask containerOverrides by the orchestrator Lambda. */
  public readonly containerName: string;

  constructor(scope: Construct, id: string, props: WorkerProps) {
    super(scope, id);

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      containerInsights: true,
    });

    this.containerName = 'video-transcoder';

    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: props.cpu,
      memoryLimitMiB: props.memoryMiB,
      // The worker downloads the full source file before FFmpeg starts.
      // Fargate's 20GiB default is too small for long-form video.
      ephemeralStorageGiB: props.ephemeralStorageGiB,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    const image = new ecr_assets.DockerImageAsset(this, 'Image', {
      directory: props.repoRoot,
      file: 'services/worker/Dockerfile',
    });

    const logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: '/stream-ops/worker',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.taskDefinition.addContainer(this.containerName, {
      image: ecs.ContainerImage.fromDockerImageAsset(image),
      environment: {
        OUTPUT_BUCKET: props.outputBucket.bucketName,
        DB_HOST: props.dbProxyEndpoint,
        DB_PORT: '5432',
        DB_NAME: 'stream_ops',
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
        DB_PASS: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'worker', logGroup }),
      essential: true,
    });

    props.inputBucket.grantRead(this.taskDefinition.taskRole);
    props.outputBucket.grantWrite(this.taskDefinition.taskRole);
    props.dbSecret.grantRead(this.taskDefinition.taskRole);
  }
}
