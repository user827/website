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
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cloudfront_origins,
  RemovalPolicy,
  Duration,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface WebsiteProps extends cdk.StackProps {
  zone: string;
  hostedZoneId: string;
  email: string;
}

export class WebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebsiteProps) {
    super(scope, id, props);

    const zone = route53.PublicHostedZone.fromHostedZoneAttributes(this, 'Zone', { zoneName: props.zone, hostedZoneId: props.hostedZoneId });

    const certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: zone.zoneName,
      subjectAlternativeNames: ['www.'+zone.zoneName],
      validation: acm.CertificateValidation.fromDns(zone),
    });

    const logBucket = new s3.Bucket(this, 'LogBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
    });
    logBucket.addLifecycleRule({
      expiration: Duration.days(7),
    });

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      //removalPolicy: RemovalPolicy.DESTROY,
      //autoDeleteObjects: true,
    });
    new CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate,
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
        origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
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
      destinationBucket: siteBucket,
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
      period: cdk.Duration.minutes(10),
      statistic: cloudwatch.Stats.SUM,
      dimensionsMap: {
        DistributionId: distribution.distributionId,
        Region: 'Global',
      },
      region: 'us-east-1',
    });
    const aRequests = mRequests.createAlarm(this, 'AlarmRequests', {
      threshold: 100,
      evaluationPeriods: 6,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
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
      period: cdk.Duration.minutes(10),
      statistic: cloudwatch.Stats.AVERAGE,
      dimensionsMap: {
        DistributionId: distribution.distributionId,
        Region: 'Global',
      },
      region: 'us-east-1',
    });

    const a5xxErrors = m5xxErrors.createAlarm(this, 'Alarm5xxErrors', {
      threshold: 1, //percentage
      evaluationPeriods: 5,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    a5xxErrors.addAlarmAction(new actions.SnsAction(t));

    const wErrors = new cloudwatch.GraphWidget({
      stacked: true,
      title: 'Errors',
      left: [
        m4xxErrors,
        m5xxErrors,
      ],
    });

    dashboard.addWidgets(wRequests, wErrors);
  }
}

// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

// https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-serve-static-website/
