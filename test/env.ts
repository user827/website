import { WebsiteProps } from '../lib/website-stage';

export const testEnv: WebsiteProps = {
  env: {
    account: '12345',
    region: 'eu-north-1',
  },
  zone: 'test',
  hostedZoneId: 'testId',
  email: 'test@test.test',
};
