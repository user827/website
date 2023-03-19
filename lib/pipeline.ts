import * as cdk from 'aws-cdk-lib';
import {
  aws_iam as iam,
  aws_ssm as ssm,
  pipelines,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WebsiteStage } from './website-stage';

export interface PipelineStackProps extends cdk.StackProps {
  zone: string;
  name: string;
  repo: string;
  branch: string;
  existingCertificateARN: string | undefined;
  email: string | undefined;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const connectionArn = ssm.StringParameter.valueFromLookup(this, `/${props.name}/connectionArn`);
    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      pipelineName: id,
      //useChangeSets: false, // be faster
      synth: new pipelines.CodeBuildStep('Synth', {
        installCommands: ['npm i -g npm@latest'],
        input: pipelines.CodePipelineSource.connection(props.repo, props.branch, {
          connectionArn,
          codeBuildCloneOutput: true,
        }),
        commands: [
          'git log',
          'npm ci',
          'npm run lint',
          'npx cdk synth',
        ],
        rolePolicyStatements: [
          new iam.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'iam:ResourceTag/aws-cdk:bootstrap-role': 'lookup',
              },
            },
          }),
        ],
      }),
    });

    if (!props.email) {
      props.email = ssm.StringParameter.valueFromLookup(this, `/${props.name}/email`);
    }
    if (!props.existingCertificateARN) {
      props.existingCertificateARN = ssm.StringParameter.valueFromLookup(this, `/${props.name}/certificateARN`);
      if (props.existingCertificateARN.startsWith('dummy-value-for-')) {
        props.existingCertificateARN = undefined;
      }
    }
    const website = new WebsiteStage(this, 'Website', {
      env: props.env,
      name: props.name,
      zone: props.zone,
      email: props.email,
      existingCertificateARN: props.existingCertificateARN,
    });
    pipeline.addStage(website);
  }
}
