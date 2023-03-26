# Loptr

Pipeline for my website https://loptr.link hosted on AWS.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

# Setup your own site
Configure cdk.json.

Setup ssm parameters in deployment region
| Parameter                         | Description                                 |
|-----------------------------------|---------------------------------------------|
| /_NAME_/email                     | Email to send service notifications         |
| /_NAME_/certificateARN (optional) | ARN of an existing certificate for the host |
|                                   | or 'dummy-value-for-...'                    |
| /_NAME_/connectionArn             | Github connection ARN                       |
| /_NAME_/pubkey                    | Key used to verify commits                  |

```
npm i
cdk bootstrap aws://<accountid>/<profile account's region>
cdk bootstrap aws://<accountid>/us-east-1
cdk deploy _NAME_
```

# Project init

```
cdk init app --language typescript
npm init @eslint/config
```
