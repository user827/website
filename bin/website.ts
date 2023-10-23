#!/usr/bin/env node
import 'source-map-support/register';
import * as fs from 'fs';
import { SSMClient, GetParameterCommand, GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import * as cdk from 'aws-cdk-lib';
import * as yaml from 'js-yaml';
import { PipelineStack, PipelineStackProps } from '../lib/pipeline';

interface Config {
  name: string;
  ssm_config_version: number;
}

// CommonJS requirement
async function main() {
  const app = new cdk.App();

  const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };
  if (!env.account) {
    throw new Error('Default account needs to be defined');
  }
  if (!env.region) {
    throw new Error('Default region needs to be defined');
  }

  const localconfig: Config = yaml.load(fs.readFileSync('env/main.yaml', { encoding: 'utf-8' })) as Config;
  if (!localconfig.name) {
    throw new Error('Name variable missing.');
  }
  if (!localconfig.ssm_config_version) {
    throw new Error('ssm_config_version missing.');
  }

  const ssm = new SSMClient({ region: env.region });
  const ssmCmd = new GetParameterCommand({
    Name: `/${localconfig.name}/config.yaml:${localconfig.ssm_config_version}`,
  });
  const ssmOut: GetParameterCommandOutput = await ssm.send(ssmCmd);
  console.log(`Using config version ${ssmOut.Parameter!.Version!}`);
  const config: PipelineStackProps = yaml.load(ssmOut.Parameter!.Value!) as PipelineStackProps;
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

  const pipeline = new PipelineStack(app, localconfig.name, { ...config, name: localconfig.name, env });

  cdk.Tags.of(pipeline).add('Project', localconfig.name);

  app.synth();
}

void main();
