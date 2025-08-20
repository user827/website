-include env.mk
name ?= website

check:
	npm run lint -- --fix
	npm run test -- --updateSnapshot

build: check
	npx cdk synth

deploy_pipeline:
	npx cdk deploy $(name)

deploy:
	npx cdk deploy $(name)/Website/'**'

diff:
	npx cdk diff $(name)/Website/'**'

diff_pipeline:
	npx cdk diff $(name)

bootstrap:
	npx cdk bootstrap aws://$(AWS_ACCOUNT)/$(AWS_REGION)
	npx cdk bootstrap aws://$(AWS_ACCOUNT)/us-east-1

.PHONY: check build deploy deploy_pipeline
