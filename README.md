# user827

Pipeline for my website https://user827.com hosted on Amazon CloudFront.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npx jest [--updateSnapshot]`    perform the jest unit tests
* `npx cdk deploy <name>`      deploy this the CodePipeline stack to your default AWS account/region
* `npx cdk deploy <name>/Website/**`      deploy the website manually
* `npx cdk diff`        compare deployed stack with current state
* `AWS_PROFILE=<profile> npx cdk synth`       emits the synthesized CloudFormation template, for testing the changes
* `npx cdk list`
* `npm update` update packages
* make check
* make build
* make deploy

# Setup your own site
- Configure hosted zone for a domain.
- Create a codestar connection for connectionArn.
- Configure ssm parameter /<name>/config.yaml using config.yaml.template.

```
npm ci
npx cdk bootstrap aws://<accountid>/<profile account's region>
npx cdk bootstrap aws://<accountid>/us-east-1
```

Deploy the website to check everything is OK.
```
AWS_PROFILE=<profile> npx cdk deploy '<name>/Website/**'

```

Deploy the pipeline.
```
AWS_PROFILE=<profile> npx cdk deploy <name>
```

## Project init

```
npx cdk@latest init app --language typescript
npm init @eslint/config
```

# TODO

- It's cheaper for CloudFront to take a DDOS rather than using WAF to filter it?
- Request increase for maxumun number of concurrently running build for
  Linux/Small environment. see https://github.com/aws/aws-cdk/issues/17744

