.PHONY: help dev build build-push deploy clean

IMAGE_NAME ?= cloudkit-console
IMAGE_TAG ?= latest
REGISTRY ?= quay.io/eerez
NAMESPACE ?= innabox-devel
CONTAINER_TOOL ?= $(shell which podman 2>/dev/null || which docker 2>/dev/null)

help:
	@echo "Available targets:"
	@echo "  dev        - Run development server locally"
	@echo "  build      - Build container image"
	@echo "  build-push - Build and push container image with unique timestamp tag"
	@echo "  deploy     - Deploy to Kubernetes cluster"
	@echo "  clean      - Remove deployment from cluster"

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
	kubectl apply -f deploy/ -n $(NAMESPACE)

clean:
	kubectl delete -f deploy/ -n $(NAMESPACE) --ignore-not-found=true
