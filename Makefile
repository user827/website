-include env.mk
name ?= website

check:
	npm run lint -- --fix
	npm run test -- --updateSnapshot

build: check
	npx cdk synth

deploy_pipeline:
	npx cdk deploy --concurrency 5 --require-approval never $(name)

deploy:
	npx cdk deploy --concurrency 5 --require-approval never $(name)/Website/'**'

.PHONY: check build deploy deploy_pipeline
