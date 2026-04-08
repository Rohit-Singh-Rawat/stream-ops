import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class Queue extends Construct {
  public readonly jobQueue: sqs.Queue;
  public readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.dlq = new sqs.Queue(this, 'Dlq', {
      queueName: 'stream-ops-jobs-dlq',
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    this.jobQueue = new sqs.Queue(this, 'Jobs', {
      queueName: 'stream-ops-jobs',
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      retentionPeriod: cdk.Duration.days(4),
      // Must exceed Lambda timeout (5 min) + worst-case ECS task cold start + max transcode time.
      visibilityTimeout: cdk.Duration.minutes(15),
      deadLetterQueue: {
        queue: this.dlq,
        maxReceiveCount: 3,
      },
    });

    const dlqDepthAlarm = new cloudwatch.Alarm(this, 'DlqAlarm', {
      alarmName: 'stream-ops-dlq-depth',
      alarmDescription: 'A transcode job has exhausted all 3 retry attempts.',
      metric: this.dlq.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(1),
        statistic: 'Maximum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const alertTopic = new sns.Topic(this, 'Alerts', {
      topicName: 'stream-ops-transcode-alerts',
    });

    dlqDepthAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));
  }
}
