.PHONY: help dev build build-push deploy clean lint lint-fix

# Environment selection: dev or integration
ENV ?= dev

IMAGE_NAME ?= osac-ui
IMAGE_TAG ?= latest
REGISTRY ?= quay.io/eerez

# Environment-specific settings
ifeq ($(ENV),integration)
  NAMESPACE ?= osac
  DEPLOY_DIR = deploy/integration
else
  NAMESPACE ?= innabox-devel
  DEPLOY_DIR = deploy/dev
endif

CONTAINER_TOOL ?= $(shell which podman 2>/dev/null || which docker 2>/dev/null)

help:
	@echo "Available targets:"
	@echo "  dev        - Run development server locally"
	@echo "  build      - Build container image"
	@echo "  build-push - Build and push container image with unique timestamp tag"
	@echo "  deploy     - Deploy to Kubernetes cluster (ENV=dev|integration)"
	@echo "  clean      - Remove deployment from cluster (ENV=dev|integration)"
	@echo "  lint       - Run ESLint to check code quality"
	@echo "  lint-fix   - Run ESLint and auto-fix issues"
	@echo ""
	@echo "Environment variables:"
	@echo "  ENV        - Target environment: dev (default) or integration"
	@echo "  NAMESPACE  - Kubernetes namespace (default based on ENV)"

dev:
	npm install
	npm run dev

build:
	$(CONTAINER_TOOL) build -t $(IMAGE_NAME):$(IMAGE_TAG) .
	$(CONTAINER_TOOL) tag $(IMAGE_NAME):$(IMAGE_TAG) $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)

build-push:
	@echo "Building and pushing container with unique tag..."
	$(eval UNIQUE_TAG := $(shell date +%Y%m%d-%H%M%S)-$(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown"))
	@echo "Using tag: $(UNIQUE_TAG)"
	$(CONTAINER_TOOL) build --no-cache -t $(REGISTRY)/$(IMAGE_NAME):$(UNIQUE_TAG) .
	$(CONTAINER_TOOL) tag $(REGISTRY)/$(IMAGE_NAME):$(UNIQUE_TAG) $(REGISTRY)/$(IMAGE_NAME):latest
	$(CONTAINER_TOOL) push $(REGISTRY)/$(IMAGE_NAME):$(UNIQUE_TAG)
	$(CONTAINER_TOOL) push $(REGISTRY)/$(IMAGE_NAME):latest
	@echo "Image pushed with tag: $(UNIQUE_TAG)"

deploy:
	@echo "Deploying to $(ENV) environment (namespace: $(NAMESPACE))..."
	kubectl apply -f $(DEPLOY_DIR)/ -n $(NAMESPACE)

clean:
	@echo "Cleaning $(ENV) environment (namespace: $(NAMESPACE))..."
	kubectl delete -f $(DEPLOY_DIR)/ -n $(NAMESPACE) --ignore-not-found=true

## deploy-image: Update UI deployment with latest unique image
deploy-image:
	@echo "Updating UI deployment with latest image..."
	$(eval LATEST_TAG := $(shell podman images $(REGISTRY)/$(IMAGE_NAME) --format "{{.Tag}}" | grep -E '^[0-9]{8}-[0-9]{6}-' | head -1))
	@if [ -z "$(LATEST_TAG)" ]; then \
		echo "No timestamped tag found, using latest"; \
		kubectl set image deployment/osac-ui console=$(REGISTRY)/$(IMAGE_NAME):latest -n $(NAMESPACE); \
	else \
		echo "Using tag: $(LATEST_TAG)"; \
		kubectl set image deployment/osac-ui console=$(REGISTRY)/$(IMAGE_NAME):$(LATEST_TAG) -n $(NAMESPACE); \
	fi

build-and-deploy-image: build-push deploy-image

lint:
	@echo "Running ESLint..."
	npm run lint

lint-fix:
	@echo "Running ESLint with auto-fix..."
	npx eslint . --ext ts,tsx --fix