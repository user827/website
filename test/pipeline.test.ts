import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { testEnv } from './env';
import { PipelineStack } from '../lib/pipeline';

const app = new cdk.App();

test('pipeline', () => {
  const props = {
    ...testEnv,
    name: 'testname',
    repo: 'owner/testrepo',
    branch: 'testbranch',
    connectionArn: 'testconnectionarn',
    pubkey: 'testpubkey',
  };
  const stack = new PipelineStack(app, 'test', props);
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

  //   template.hasResourceProperties('AWS::SQS::Queue', {
  //     VisibilityTimeout: 300
  //   });
});
