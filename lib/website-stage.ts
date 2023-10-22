import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WebsiteStack, S3Stack } from '../lib/website-stack';

export interface WebsiteProps extends cdk.StageProps {
  zone: string;
  hostedZoneId: string;
  email: string;
}

export class WebsiteStage extends cdk.Stage {
  public readonly s3: S3Stack;
  public readonly website: WebsiteStack;

  constructor(scope: Construct, id: string, props: WebsiteProps) {
    super(scope, id, props);

    if (!props.env) {
      throw new Error('env needs to be defined');
    }
    const env = props.env;

    this.s3 = new S3Stack(this, 'S3Stack', {
      env: { account: env.account, region: 'us-east-1' },
      zone: props.zone,
    });

    this.website = new WebsiteStack(this, 'WebsiteStack', {
      env: { account: env.account, region: 'us-east-1' },
      cloudfrontOAI: this.s3.cloudfrontOAI,
      siteBucket: this.s3.siteBucket,
      zone: props.zone,
      hostedZoneId: props.hostedZoneId,
      email: props.email,
    });
  }
}

export interface CertificateProps extends cdk.StageProps {
  zone: string;
  existingCertificateARN: string | undefined;
}
