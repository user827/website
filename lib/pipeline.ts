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
  useExistingCertifcateARN: boolean;
  existingCertificateARN: string | undefined;
  email: string | undefined;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // For the lookups to work
    if (!props.env) {
      throw new Error('env needs to be defined');
    }

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      pipelineName: id,
      synth: new pipelines.CodeBuildStep('Synth', {
        installCommands: ['npm i -g npm@latest'],
        input: pipelines.CodePipelineSource.connection(props.repo, props.branch, {
          connectionArn: ssm.StringParameter.valueForStringParameter(this, `/${props.name}/connectionArn`),
          codeBuildCloneOutput: true,
        }),
        env: {
          PUBKEY: ssm.StringParameter.valueForStringParameter(this, `/${props.name}/pubkey`),
        },
        commands: [
          'echo "$PUBKEY" | gpg --import',
          'git verify-commit -v HEAD',
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
    if (props.useExistingCertifcateARN) {
      if (!props.existingCertificateARN) {
        props.existingCertificateARN = ssm.StringParameter.valueFromLookup(this, `/${props.name}/certificateARN`);
      }
    }
    const website = new WebsiteStage(this, 'Website', {
      env: props.env,
      name: props.name,
      zone: props.zone,
      email: props.email,
      useExistingCertifcateARN: props.useExistingCertifcateARN,
      existingCertificateARN: props.existingCertificateARN,
    });
    cdk.Tags.of(website).add('Project', props.name);
    pipeline.addStage(website);
  }
}
