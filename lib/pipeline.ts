import * as cdk from 'aws-cdk-lib';
import {
  aws_iam as iam,
  pipelines,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WebsiteStage } from './website-stage';

export interface PipelineStackProps extends cdk.StackProps {
  zone: string;
  hostedZoneId: string;
  name: string;
  repo: string;
  branch: string;
  email: string;
  connectionArn: string;
  pubkey: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      pipelineName: id,
      synth: new pipelines.CodeBuildStep('Synth', {
        //installCommands: ['npm i -g npm@latest'],
        input: pipelines.CodePipelineSource.connection(props.repo, props.branch, {
          connectionArn: props.connectionArn,
          codeBuildCloneOutput: true,
        }),
        env: {
          PUBKEY: props.pubkey,
        },
        commands: [
          'echo "$PUBKEY" | gpg --import',
          'git verify-commit -v HEAD',
          'npm ci',
          'npm run lint',
          'npm run test',
          'npx cdk synth',
        ],
        rolePolicyStatements: [
          new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/${props.name}/config.yaml`],
          }),
        ],
      }),
    });

    const website = new WebsiteStage(this, 'Website', {
      env: props.env,
      zone: props.zone,
      hostedZoneId: props.hostedZoneId,
      email: props.email,
    });
    cdk.Tags.of(website).add('Project', props.name);
    pipeline.addStage(website);
  }
}
