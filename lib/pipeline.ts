import * as cdk from 'aws-cdk-lib';
import {
  aws_events as events,
  aws_events_targets as event_targets,
  aws_iam as iam,
  aws_sns as sns,
  aws_sns_subscriptions as subscriptions,
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

    const failedPipelineRule = new events.Rule(this, 'PipelineFailures', {
      eventPattern: {
        source: ['aws.codepipeline'],
        detailType: ['CodePipeline Pipeline Execution State Change'],
        detail: {
          pipeline: [id],
          state: ['FAILED'],
        },
      },
    });

    const t = new sns.Topic(this, 'PipelineTopic', {});
    t.addSubscription(new subscriptions.EmailSubscription(props.email));
    failedPipelineRule.addTarget(new event_targets.SnsTopic(t));
  }
}
