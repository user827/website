#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline';

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };
if (!env.account) {
  throw new Error('Default account needs to be defined');
}
if (!env.region) {
  throw new Error('Default region needs to be defined');
}

const name = app.node.tryGetContext('name');
if (!name) {
  throw new Error('Name variable missing.');
}

const zone = app.node.tryGetContext('zone');
if (!zone) {
  throw new Error('Zone variable missing.');
}

const repo = app.node.tryGetContext('repo');
if (!repo) {
  throw new Error('Repo variable missing.');
}

const branch = app.node.tryGetContext('branch');
if (!branch) {
  throw new Error('Branch variable missing.');
}

const pipeline = new PipelineStack(app, name, {
  env,
  zone,
  name,
  repo,
  branch,
  email: app.node.tryGetContext('email'),
});

cdk.Tags.of(pipeline).add('Project', name);

// TODO ratelimiting: If it's the second one, you can implement a request throttling method. For example, you can make use of incoming requests to EC2 instances are free. So you can implement a queue in a free tier EC2 instance that forwards the requests to your Lambda but drops the requests when the rate is higher than a defined threshold. Keep in mind that you get charged for outgoing requests from EC2 to your Lambda Edge.

// https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/static-site/static-site.ts
// https://github.com/aws-samples/amazon-cloudfront-secure-static-site/blob/master/templates/custom-resource.yaml

app.synth();
