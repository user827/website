# user827

Pipeline for my website https://user827.com hosted on Amazon CloudFront.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npx jest [--updateSnapshot]`    perform the jest unit tests
* `npx cdk deploy <name>`      deploy this the CodePipeline stack to your default AWS account/region
* `npx cdk deploy <name>/Website/**`      deploy the website manually
* `npx cdk diff`        compare deployed stack with current state
* `npx cdk synth --profile <profile>`       emits the synthesized CloudFormation template, for testing the changes
* `npx cdk list`

# Setup your own site
Configure cdk.json. The hosted zone for the domain needs to exist.

Setup ssm parameters in deployment region
| Parameter                         | Description                                 |
|-----------------------------------|---------------------------------------------|
| /_NAME_/email                     | Email to send service notifications         |
| /_NAME_/connectionArn             | Github connection ARN                       |
| /_NAME_/pubkey                    | Key used to verify commits                  |

```
npm i
npx cdk bootstrap aws://<accountid>/<profile account's region>
npx cdk bootstrap aws://<accountid>/us-east-1
```

Deploy the website to check everything is OK.
```
npx cdk deploy '_NAME_/Website/**'

```

Deploy the pipeline.
```
npx cdk deploy _NAME_
```

# Development

* `npm update` update packages

## Project init

```
npx cdk@latest init app --language typescript
npm init @eslint/config
```
