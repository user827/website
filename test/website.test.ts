import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { testEnv } from './env';
import { WebsiteStage } from '../lib/website-stage';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/website-stack.ts

const app = new cdk.App();
const stage = new WebsiteStage(app, 'test', testEnv);

test('s3', () => {
  const template = Template.fromStack(stage.s3);
  expect(template.toJSON()).toMatchSnapshot();

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});

test('website', () => {
  const template = Template.fromStack(stage.website);
  expect(template.toJSON()).toMatchSnapshot();

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});
