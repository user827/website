import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { testEnv } from './env';
import { WebsiteStage } from '../lib/website-stage';

const app = new cdk.App();
const stage = new WebsiteStage(app, 'test', testEnv);

test('website', () => {
  const template = Template.fromStack(stage.website);
  expect(template.toJSON()).toMatchSnapshot();
});
