import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda_event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as path from 'path';
import { Construct } from 'constructs';

export interface OrchestratorProps {
  readonly inputBucket: s3.Bucket;
  readonly jobQueue: sqs.Queue;
  readonly cluster: ecs.Cluster;
  readonly taskDefinition: ecs.FargateTaskDefinition;
  readonly containerName: string;
  readonly workerSubnets: ec2.ISubnet[];
  readonly workerSecurityGroup: ec2.SecurityGroup;
  readonly repoRoot: string;
}

export class Orchestrator extends Construct {
  constructor(scope: Construct, id: string, props: OrchestratorProps) {
    super(scope, id);

    const subnetIds = props.workerSubnets.map((s) => s.subnetId).join(',');
    const sgIds = props.workerSecurityGroup.securityGroupId;

    const logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: '/stream-ops/orchestrator',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // esbuild bundles the handler via local infra/node_modules — no Docker needed.
    // @aws-sdk/* is excluded because Lambda Node 22.x includes SDK v3.
    // @stream-ops/logger is resolved through the monorepo workspace symlinks;
    // run `bun install` from the repo root before deploying.
    const fn = new lambda_nodejs.NodejsFunction(this, 'Handler', {
      functionName: 'stream-ops-orchestrator',
      entry: path.join(props.repoRoot, 'apps/orchestrator/src/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
      bundling: {
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
        minify: true,
        sourceMap: true,
      },
      environment: {
        ECS_CLUSTER: props.cluster.clusterArn,
        TASK_DEF: props.taskDefinition.taskDefinitionArn,
        CONTAINER_NAME: props.containerName,
        SUBNETS: subnetIds,
        SECURITY_GROUPS: sgIds,
      },
      logGroup,
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ecs:RunTask'],
        resources: [props.taskDefinition.taskDefinitionArn],
      })
    );

    // iam:PassRole is required by ECS RunTask — the caller must be able to pass
    // both the task role and execution role to the ECS service on its behalf.
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [
          props.taskDefinition.taskRole.roleArn,
          props.taskDefinition.executionRole!.roleArn,
        ],
      })
    );

    props.inputBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(props.jobQueue)
    );

    fn.addEventSource(
      new lambda_event_sources.SqsEventSource(props.jobQueue, {
        batchSize: 1,
        // Partial-failure reporting so only the failed message is retried, not the whole batch.
        reportBatchItemFailures: true,
      })
    );
  }
}
