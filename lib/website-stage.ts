import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WebsiteStack } from '../lib/website-stack';

export interface WebsiteProps extends cdk.StageProps {
  zone: string;
  hostedZoneId: string;
  email: string;
}

export class WebsiteStage extends cdk.Stage {
  public readonly website: WebsiteStack;

  constructor(scope: Construct, id: string, props: WebsiteProps) {
    super(scope, id, props);

    if (!props.env) {
      throw new Error('env needs to be defined');
    }
    const env = props.env;

    this.website = new WebsiteStack(this, 'WebsiteStack', {
      env: { account: env.account, region: 'us-east-1' },
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
