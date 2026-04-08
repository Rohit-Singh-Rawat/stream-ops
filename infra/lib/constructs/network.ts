import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class Network extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly apiSecurityGroup: ec2.SecurityGroup;
  public readonly webSecurityGroup: ec2.SecurityGroup;
  public readonly workerSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      // Single NAT reduces cost (~$32/month per NAT). Increase to 2 for HA across AZ failures.
      natGateways: 1,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
      ],
    });

    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc: this.vpc,
      description: 'ALB: HTTP/HTTPS from internet',
    });
    this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    this.apiSecurityGroup = new ec2.SecurityGroup(this, 'ApiSg', {
      vpc: this.vpc,
      description: 'Hono API containers: inbound from ALB only',
    });
    this.apiSecurityGroup.addIngressRule(this.albSecurityGroup, ec2.Port.tcp(4000));

    this.webSecurityGroup = new ec2.SecurityGroup(this, 'WebSg', {
      vpc: this.vpc,
      description: 'Next.js containers: inbound from ALB only',
    });
    this.webSecurityGroup.addIngressRule(this.albSecurityGroup, ec2.Port.tcp(3000));

    this.workerSecurityGroup = new ec2.SecurityGroup(this, 'WorkerSg', {
      vpc: this.vpc,
      description: 'Worker Fargate tasks: outbound only',
    });

    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSg', {
      vpc: this.vpc,
      description: 'Aurora: inbound from API and worker only',
    });
    this.dbSecurityGroup.addIngressRule(this.apiSecurityGroup, ec2.Port.tcp(5432));
    this.dbSecurityGroup.addIngressRule(this.workerSecurityGroup, ec2.Port.tcp(5432));
  }
}
