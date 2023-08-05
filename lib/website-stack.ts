import * as cdk from 'aws-cdk-lib';

import {
  aws_route53_targets as targets,
  aws_certificatemanager as acm,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as actions,
  aws_sns as sns,
  aws_sns_subscriptions as subscriptions,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
  aws_route53 as route53,
  aws_iam as iam,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cloudfront_origins,
  RemovalPolicy,
  Duration,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface WebsiteProps extends cdk.StackProps {
  cloudfrontOAI: cloudfront.IOriginAccessIdentity;
  siteBucket: s3.IBucket;
  certificate: acm.ICertificate;
  zone: string;
  email: string;
}

export class WebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebsiteProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.zone });

    const logBucket = new s3.Bucket(this, 'LogBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    logBucket.addLifecycleRule({
      expiration: Duration.days(7),
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: props.certificate,
      logBucket,
      defaultRootObject: 'index.html',
      domainNames: [zone.zoneName, 'www.'+zone.zoneName],
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
          ttl: Duration.minutes(30),
        },
      ],
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(props.siteBucket, { originAccessIdentity: props.cloudfrontOAI }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

    // Route53 alias record for the CloudFront distribution
    new route53.ARecord(this, 'SiteApexAliasRecord', {
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      zone,
    });

    new route53.ARecord(this, 'SiteAliasRecord', {
      recordName: 'www',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      zone,
    });

    // Deploy site contents to S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
      sources: [s3deploy.Source.asset('./site-contents')],
      destinationBucket: props.siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });


    this.createDashboard(distribution, props.email);
  }

  createDashboard(distribution: cloudfront.IDistribution, email: string): void {
    const t = new sns.Topic(this, 'TopicRule', {});

    t.addSubscription(new subscriptions.EmailSubscription(email));

    // Dashboard configuration
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: this.node.path.replace(/\//g, '-'),
    });

    const mRequests = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: 'Requests',
      period: cdk.Duration.minutes(1),
      statistic: cloudwatch.Stats.SUM,
      dimensionsMap: {
        DistributionId: distribution.distributionId,
        Region: 'Global',
      },
      region: 'us-east-1',
    });
    const aRequests = mRequests.createAlarm(this, 'AlarmRequests', {
      threshold: 1000,
      evaluationPeriods: 1,
    });
    aRequests.addAlarmAction(new actions.SnsAction(t));

    const wRequests = new cloudwatch.GraphWidget({
      title: 'Requests',
      left: [
        mRequests,
      ],
    });

    const m4xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: '4xxErrorRate',
      period: cdk.Duration.minutes(1),
      statistic: cloudwatch.Stats.AVERAGE,
      dimensionsMap: {
        DistributionId: distribution.distributionId,
        Region: 'Global',
      },
      region: 'us-east-1',
    });

    const m5xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: '5xxErrorRate',
      period: cdk.Duration.minutes(1),
      statistic: cloudwatch.Stats.AVERAGE,
      dimensionsMap: {
        DistributionId: distribution.distributionId,
        Region: 'Global',
      },
      region: 'us-east-1',
    });

    const wErrors = new cloudwatch.GraphWidget({
      stacked: true,
      title: 'Errors',
      left: [
        m4xxErrors,
      ],
      right: [
        m5xxErrors,
      ],
    });

    dashboard.addWidgets(wRequests, wErrors);
  }
}

export interface CertificateProps extends cdk.StackProps {
  zone: string;
  existingCertificateARN: string | undefined;
}


export class CertificateStack extends cdk.Stack {
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: CertificateProps) {
    super(scope, id, props);
    if (!props.env) {
      throw new Error('need region');
    }
    if (props.env.region != 'us-east-1') {
      throw new Error('wrong region');
    }

    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.zone });

    // Certificates are expensive to make so try to do it only once and for all
    if (props.existingCertificateARN) {
      this.certificate = acm.Certificate.fromCertificateArn(this, 'SiteCertificate', props.existingCertificateARN);
    } else {
      this.certificate = new acm.Certificate(this, 'SiteCertificate', {
        domainName: zone.zoneName,
        subjectAlternativeNames: ['www.'+zone.zoneName],
        validation: acm.CertificateValidation.fromDns(zone),
      });
      this.certificate.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    new CfnOutput(this, 'Certificate', {
      value: this.certificate.certificateArn,
    });
  }
}

export interface S3Props extends cdk.StackProps {
  zone: string;
}

export class S3Stack extends cdk.Stack {
  public readonly siteBucket: s3.IBucket;
  public readonly cloudfrontOAI: cloudfront.OriginAccessIdentity;

  constructor(scope: Construct, id: string, props: S3Props) {
    super(scope, id, props);

    this.cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, 'CloudfrontOAI', {
      comment: `OAI for ${id}`,
    });

    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    new CfnOutput(this, 'Bucket', { value: this.siteBucket.bucketName });

    // Grant access to cloudfront
    const result = this.siteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [this.siteBucket.arnForObjects('*')],
      principals: [new iam.CanonicalUserPrincipal(this.cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
    }));

    if (!result) {
      throw new Error('addToResourcePolicy failed');
    }
  }
}

// TODO use arn sourcearn for OAC instead of the deprecated OAI
// https://github.com/aws/aws-cdk/issues/21771
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

// https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-serve-static-website/
