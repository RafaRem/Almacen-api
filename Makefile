SHELL := /bin/sh

.PHONY: help install test test-unit test-e2e test-cov test-watch lint build clean-coverage

help:
	@echo "Backend test commands"
	@echo ""
	@echo "  make install         Install dependencies with npm ci"
	@echo "  make test            Run unit tests with NODE_ENV=test"
	@echo "  make test-unit       Same as make test"
	@echo "  make test-e2e        Run isolated e2e tests without the real DB"
	@echo "  make test-cov        Run unit tests with coverage"
	@echo "  make test-watch      Run Jest in watch mode"
	@echo "  make lint            Run ESLint"
	@echo "  make build           Compile the backend"
	@echo "  make clean-coverage  Remove coverage artifacts"

install:
	npm ci

test:
	NODE_ENV=test npm test

test-unit:
	NODE_ENV=test npm run test:unit

test-e2e:
	NODE_ENV=test npm run test:e2e

test-cov:
	NODE_ENV=test npm run test:cov

test-watch:
	NODE_ENV=test npm run test:watch

lint:
	npm run lint

build:
	npm run build

clean-coverage:
	rm -rf coverage
