#!/usr/bin/env node
import * as fs from 'fs';
import * as cdk from 'aws-cdk-lib';
import * as yaml from 'js-yaml';
import { PipelineStack, PipelineStackProps } from '../lib/pipeline';

const app = new cdk.App();

const config: PipelineStackProps = yaml.load(fs.readFileSync('config.yaml', { encoding: 'utf-8' })) as PipelineStackProps;
if (!config.env?.account) {
  throw new Error('Default account needs to be defined');
}
if (!config.env?.region) {
  throw new Error('Default region needs to be defined');
}
if (!config.name) {
  throw new Error('Name variable missing.');
}
if (!config.zone) {
  throw new Error('Zone variable missing.');
}
if (!config.hostedZoneId) {
  throw new Error('HostedZoneId variable missing.');
}
if (!config.repo) {
  throw new Error('Repo variable missing.');
}
if (!config.branch) {
  throw new Error('Branch variable missing.');
}
if (!config.email) {
  throw new Error('Email variable missing.');
}
if (!config.connectionArn) {
  throw new Error('ConnectionArn variable missing.');
}
if (!config.pubkey) {
  throw new Error('Pubkey variable missing.');
}

const pipeline = new PipelineStack(app, config.name, config);

cdk.Tags.of(pipeline).add('Project', config.name);

app.synth();
