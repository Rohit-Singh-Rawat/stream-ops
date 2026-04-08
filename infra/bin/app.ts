#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { StreamOpsStack } from '../lib/stream-ops-stack';

const app = new cdk.App();

// These context values are only available after first deploy (see stack CfnOutputs).
// Pass them on subsequent deploys so the web image is built with the correct URLs:
// cdk deploy --context api-url=http://<alb-dns> --context asset-base-url=https://<cf-domain>
const apiUrl = app.node.tryGetContext('api-url') as string | undefined;
const assetBaseUrl = app.node.tryGetContext('asset-base-url') as string | undefined;

new StreamOpsStack(app, 'StreamOps', {
  repoRoot: path.join(__dirname, '../..'),
  apiUrl,
  assetBaseUrl,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  tags: {
    Project: 'stream-ops',
  },
});
