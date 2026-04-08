import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';
import { Construct } from 'constructs';

export interface ApiServiceProps {
  readonly cluster: ecs.Cluster;
  readonly securityGroup: ec2.SecurityGroup;
  readonly albSecurityGroup: ec2.SecurityGroup;
  readonly inputBucket: s3.Bucket;
  readonly outputBucket: s3.Bucket;
  readonly jobQueue: sqs.Queue;
  readonly dbSecret: secretsmanager.ISecret;
  readonly dbProxyEndpoint: string;
  readonly cpu: number;
  readonly memoryMiB: number;
  readonly minCapacity: number;
  readonly maxCapacity: number;
  readonly repoRoot: string;
}

export class ApiService extends Construct {
  /** Used as the NEXT_PUBLIC_API_BASE_URL build arg for the web image. */
  public readonly loadBalancerDnsName: string;

  constructor(scope: Construct, id: string, props: ApiServiceProps) {
    super(scope, id);

    const image = new ecr_assets.DockerImageAsset(this, 'Image', {
      directory: props.repoRoot,
      file: 'apps/api/Dockerfile',
    });

    const logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: '/stream-ops/api',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster: props.cluster,
      cpu: props.cpu,
      memoryLimitMiB: props.memoryMiB,
      desiredCount: props.minCapacity,
      securityGroups: [props.securityGroup],
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        image: ecs.ContainerImage.fromDockerImageAsset(image),
        containerPort: 4000,
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'api', logGroup }),
        environment: {
          AWS_REGION: cdk.Stack.of(this).region,
          INPUT_BUCKET: props.inputBucket.bucketName,
          OUTPUT_BUCKET: props.outputBucket.bucketName,
          QUEUE_URL: props.jobQueue.queueUrl,
          DB_HOST: props.dbProxyEndpoint,
          DB_PORT: '5432',
          DB_NAME: 'stream_ops',
          PORT: '4000',
        },
        secrets: {
          DB_USER: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
          DB_PASS: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
        },
      },
      publicLoadBalancer: true,
      listenerPort: 80,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    service.targetGroup.configureHealthCheck({
      path: '/api/videos',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      unhealthyThresholdCount: 3,
    });

    service.loadBalancer.addSecurityGroup(props.albSecurityGroup);

    const scaling = service.service.autoScaleTaskCount({
      minCapacity: props.minCapacity,
      maxCapacity: props.maxCapacity,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    props.inputBucket.grantReadWrite(service.taskDefinition.taskRole);
    props.outputBucket.grantRead(service.taskDefinition.taskRole);
    props.jobQueue.grantSendMessages(service.taskDefinition.taskRole);
    props.dbSecret.grantRead(service.taskDefinition.taskRole);

    this.loadBalancerDnsName = service.loadBalancer.loadBalancerDnsName;
  }
}
