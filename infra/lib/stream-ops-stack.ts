import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { defaultConfig } from './config';
import { Network } from './constructs/network';
import { Storage } from './constructs/storage';
import { Database } from './constructs/database';
import { Queue } from './constructs/queue';
import { Worker } from './constructs/worker';
import { Orchestrator } from './constructs/orchestrator';
import { ApiService } from './constructs/api-service';
import { WebService } from './constructs/web-service';

export interface StreamOpsStackProps extends cdk.StackProps {
  /** Absolute path to the monorepo root. */
  readonly repoRoot: string;
  /**
   * API ALB URL — required on second and subsequent deploys so the web image
   * is built with the correct NEXT_PUBLIC_API_BASE_URL.
   * Obtain from the ApiUrl stack output after first deploy.
   */
  readonly apiUrl: string | undefined;
  /**
   * CloudFront URL — obtain from AssetBaseUrl stack output after first deploy.
   */
  readonly assetBaseUrl: string | undefined;
}

export class StreamOpsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StreamOpsStackProps) {
    super(scope, id, props);

    const cfg = defaultConfig;

    const network = new Network(this, 'Network');

    const storage = new Storage(this, 'Storage', {
      accountId: this.account,
      region: this.region,
    });

    const database = new Database(this, 'Database', {
      vpc: network.vpc,
      securityGroup: network.dbSecurityGroup,
      minCapacity: cfg.dbMinCapacity,
      maxCapacity: cfg.dbMaxCapacity,
    });

    const queue = new Queue(this, 'Queue');

    const worker = new Worker(this, 'Worker', {
      vpc: network.vpc,
      securityGroup: network.workerSecurityGroup,
      inputBucket: storage.inputBucket,
      outputBucket: storage.outputBucket,
      dbSecret: database.secret,
      dbProxyEndpoint: database.proxyEndpoint,
      cpu: cfg.workerCpu,
      memoryMiB: cfg.workerMemoryMiB,
      ephemeralStorageGiB: cfg.workerEphemeralStorageGiB,
      repoRoot: props.repoRoot,
    });

    new Orchestrator(this, 'Orchestrator', {
      inputBucket: storage.inputBucket,
      jobQueue: queue.jobQueue,
      cluster: worker.cluster,
      taskDefinition: worker.taskDefinition,
      containerName: worker.containerName,
      workerSubnets: network.vpc.privateSubnets,
      workerSecurityGroup: network.workerSecurityGroup,
      repoRoot: props.repoRoot,
    });

    const api = new ApiService(this, 'Api', {
      cluster: worker.cluster,
      securityGroup: network.apiSecurityGroup,
      albSecurityGroup: network.albSecurityGroup,
      inputBucket: storage.inputBucket,
      outputBucket: storage.outputBucket,
      jobQueue: queue.jobQueue,
      dbSecret: database.secret,
      dbProxyEndpoint: database.proxyEndpoint,
      cpu: cfg.apiCpu,
      memoryMiB: cfg.apiMemoryMiB,
      minCapacity: cfg.apiMinCapacity,
      maxCapacity: cfg.apiMaxCapacity,
      repoRoot: props.repoRoot,
    });

    const web = new WebService(this, 'Web', {
      cluster: worker.cluster,
      securityGroup: network.webSecurityGroup,
      albSecurityGroup: network.albSecurityGroup,
      cpu: cfg.webCpu,
      memoryMiB: cfg.webMemoryMiB,
      repoRoot: props.repoRoot,
      apiBaseUrl: props.apiUrl ?? `http://${api.loadBalancerDnsName}`,
      assetBaseUrl: props.assetBaseUrl ?? storage.assetBaseUrl,
    });

    // Stack outputs — feed ApiUrl and AssetBaseUrl back as --context on subsequent deploys.
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `http://${api.loadBalancerDnsName}`,
      description: '--context api-url=<value>',
    });

    new cdk.CfnOutput(this, 'WebUrl', {
      value: `http://${web.loadBalancerDnsName}`,
    });

    new cdk.CfnOutput(this, 'AssetBaseUrl', {
      value: storage.assetBaseUrl,
      description: '--context asset-base-url=<value>',
    });

    new cdk.CfnOutput(this, 'InputBucket', {
      value: storage.inputBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'OutputBucket', {
      value: storage.outputBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'JobQueueUrl', {
      value: queue.jobQueue.queueUrl,
    });
  }
}
