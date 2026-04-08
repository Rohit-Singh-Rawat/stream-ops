import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DatabaseProps {
  readonly vpc: ec2.Vpc;
  readonly securityGroup: ec2.SecurityGroup;
  readonly minCapacity: number;
  readonly maxCapacity: number;
}

export class Database extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  /**
   * RDS Proxy endpoint — use as DB_HOST in ECS tasks.
   * Pools connections so concurrent task startups don't exhaust Aurora's max_connections.
   */
  public readonly proxyEndpoint: string;
  public readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.securityGroup],
      serverlessV2MinCapacity: props.minCapacity,
      serverlessV2MaxCapacity: props.maxCapacity,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      defaultDatabaseName: 'stream_ops',
      storageEncrypted: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      backup: {
        retention: cdk.Duration.days(7),
      },
    });

    this.secret = this.cluster.secret!;

    const proxy = new rds.DatabaseProxy(this, 'Proxy', {
      proxyTarget: rds.ProxyTarget.fromCluster(this.cluster),
      secrets: [this.secret],
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.securityGroup],
      dbProxyName: 'stream-ops-proxy',
      requireTLS: true,
      // IAM auth adds a token-exchange round-trip on every new connection — avoid the latency.
      iamAuth: false,
    });

    this.proxyEndpoint = proxy.endpoint;
  }
}
