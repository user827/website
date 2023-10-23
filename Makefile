-include env.mk
name ?= website

check:
	npm run lint -- --fix
	npm run test -- --updateSnapshot

build: check
	AWS_PROFILE=$(AWS_PROFILE) npx cdk synth

deploy_pipeline:
	AWS_PROFILE=$(AWS_PROFILE) npx cdk deploy --concurrency 5 --require-approval never $(name)

deploy:
	AWS_PROFILE=$(AWS_PROFILE) npx cdk deploy --concurrency 5 --require-approval never $(name)/Website/'**'

.PHONY: check build deploy deploy_pipeline
