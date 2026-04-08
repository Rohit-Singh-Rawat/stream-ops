import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';

export interface WebServiceProps {
  readonly cluster: ecs.Cluster;
  readonly securityGroup: ec2.SecurityGroup;
  readonly albSecurityGroup: ec2.SecurityGroup;
  readonly cpu: number;
  readonly memoryMiB: number;
  readonly repoRoot: string;
  /**
   * Next.js bakes NEXT_PUBLIC_* vars into the JS bundle at build time, not runtime.
   * This URL must be known when the Docker image is built.
   * On first deploy it can be omitted; pass it via --context on subsequent deploys.
   */
  readonly apiBaseUrl: string | undefined;
  readonly assetBaseUrl: string | undefined;
}

export class WebService extends Construct {
  public readonly loadBalancerDnsName: string;

  constructor(scope: Construct, id: string, props: WebServiceProps) {
    super(scope, id);

    const image = new ecr_assets.DockerImageAsset(this, 'Image', {
      directory: props.repoRoot,
      file: 'apps/web/Dockerfile',
      buildArgs: {
        NEXT_PUBLIC_API_BASE_URL: props.apiBaseUrl ?? '',
        NEXT_PUBLIC_ASSET_BASE_URL: props.assetBaseUrl ?? '',
      },
    });

    const logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: '/stream-ops/web',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster: props.cluster,
      cpu: props.cpu,
      memoryLimitMiB: props.memoryMiB,
      desiredCount: 1,
      securityGroups: [props.securityGroup],
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        image: ecs.ContainerImage.fromDockerImageAsset(image),
        containerPort: 3000,
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'web', logGroup }),
        environment: {
          NODE_ENV: 'production',
        },
      },
      publicLoadBalancer: true,
      listenerPort: 80,
      healthCheckGracePeriod: cdk.Duration.seconds(90),
    });

    service.targetGroup.configureHealthCheck({
      path: '/',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      unhealthyThresholdCount: 3,
    });

    service.loadBalancer.addSecurityGroup(props.albSecurityGroup);

    this.loadBalancerDnsName = service.loadBalancer.loadBalancerDnsName;
  }
}
