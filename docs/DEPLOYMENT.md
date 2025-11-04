# Deployment Guide

This guide covers deploying CloudKit Console to production environments using Docker/Podman and Kubernetes/OpenShift.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Building the Container Image](#building-the-container-image)
- [Kubernetes Deployment](#kubernetes-deployment)
- [OpenShift Deployment](#openshift-deployment)
- [Configuration](#configuration)
- [Monitoring & Troubleshooting](#monitoring--troubleshooting)

## Prerequisites

### Required Tools

- Docker or Podman
- kubectl (for Kubernetes) or oc (for OpenShift)
- Access to a container registry (e.g., Quay.io, Docker Hub)
- Kubernetes cluster or OpenShift cluster

### Required Services

- **Fulfillment API**: Running and accessible
- **Keycloak**: Configured with `innabox` realm
- **Container Registry**: For storing images

## Building the Container Image

### Using Make (Recommended)

The project includes a Makefile for easy building:

```bash
# Build and push with automatic timestamp tag
make build-push

# This will:
# 1. Build the image with tag: YYYYMMDD-HHMMSS-<git-sha>
# 2. Tag as 'latest'
# 3. Push both tags to registry
```

### Manual Build

```bash
# Set variables
export REGISTRY=quay.io/youruser
export IMAGE_NAME=cloudkit-console
export TAG=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)

# Build
podman build -t $REGISTRY/$IMAGE_NAME:$TAG .

# Tag as latest
podman tag $REGISTRY/$IMAGE_NAME:$TAG $REGISTRY/$IMAGE_NAME:latest

# Push
podman push $REGISTRY/$IMAGE_NAME:$TAG
podman push $REGISTRY/$IMAGE_NAME:latest
```

### Multi-Architecture Builds

For ARM64 and AMD64 support:

```bash
podman buildx build --platform linux/amd64,linux/arm64 \
  -t $REGISTRY/$IMAGE_NAME:$TAG \
  --push .
```

## Kubernetes Deployment

### Quick Deploy

```bash
# Deploy all resources
kubectl apply -f deploy/ -n your-namespace
```

### Step-by-Step Deployment

#### 1. Create Namespace

```bash
kubectl create namespace cloudkit-console
```

#### 2. Deploy RBAC (if needed)

```bash
kubectl apply -f deploy/rbac.yaml -n cloudkit-console
```

#### 3. Deploy Application

```bash
kubectl apply -f deploy/deployment.yaml -n cloudkit-console
kubectl apply -f deploy/service.yaml -n cloudkit-console
kubectl apply -f deploy/route.yaml -n cloudkit-console
```

#### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n cloudkit-console

# Check services
kubectl get svc -n cloudkit-console

# Check routes (OpenShift) or ingress (Kubernetes)
kubectl get route -n cloudkit-console  # OpenShift
kubectl get ingress -n cloudkit-console  # Kubernetes
```

### Configuration via ConfigMap

Create a ConfigMap for environment variables:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloudkit-console-config
  namespace: cloudkit-console
data:
  VITE_API_BASE_URL: "https://fulfillment-api.example.com"
  VITE_OIDC_AUTHORITY: "https://keycloak.example.com/realms/innabox"
  VITE_OIDC_CLIENT_ID: "cloudkit-console"
  VITE_OIDC_REDIRECT_URI: "https://console.example.com/callback"
  VITE_OIDC_SILENT_REDIRECT_URI: "https://console.example.com/silent-renew.html"
  VITE_OIDC_SCOPE: "openid profile email groups"
```

Apply it:

```bash
kubectl apply -f configmap.yaml -n cloudkit-console
```

Update deployment to use ConfigMap:

```yaml
spec:
  template:
    spec:
      containers:
      - name: console
        envFrom:
        - configMapRef:
            name: cloudkit-console-config
```

## OpenShift Deployment

### Using oc CLI

```bash
# Login to OpenShift
oc login https://api.cluster.example.com:6443

# Create project
oc new-project cloudkit-console

# Deploy
oc apply -f deploy/

# Create route
oc create route edge cloudkit-console \
  --service=cloudkit-console \
  --port=8080
```

### Using OpenShift Web Console

1. Navigate to **Developer** perspective
2. Click **+Add** → **Import from Git**
3. Enter repository URL
4. Select **Dockerfile** as import strategy
5. Configure deployment settings
6. Click **Create**

## Configuration

### Environment Variables

Update the deployment with your configuration:

```yaml
env:
- name: VITE_API_BASE_URL
  value: "https://fulfillment-api-foobar.apps.ostest.test.metalkube.org"
- name: VITE_OIDC_AUTHORITY
  value: "https://keycloak-foobar.apps.ostest.test.metalkube.org/realms/innabox"
- name: VITE_OIDC_CLIENT_ID
  value: "cloudkit-console"
- name: VITE_OIDC_REDIRECT_URI
  value: "https://cloudkit-console-foobar.apps.ostest.test.metalkube.org/callback"
```

### Resource Limits

Set appropriate resource limits:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

### Replicas

For high availability:

```yaml
spec:
  replicas: 3
```

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cloudkit-console-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cloudkit-console
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Monitoring & Troubleshooting

### View Logs

```bash
# Get pod name
POD=$(kubectl get pods -n cloudkit-console -l app=cloudkit-console -o jsonpath='{.items[0].metadata.name}')

# View logs
kubectl logs -f $POD -n cloudkit-console

# View previous logs (if pod crashed)
kubectl logs $POD --previous -n cloudkit-console
```

### Check Pod Status

```bash
kubectl describe pod $POD -n cloudkit-console
```

### Common Issues

**Issue:** Pod in CrashLoopBackOff

**Solution:**
```bash
# Check logs
kubectl logs $POD -n cloudkit-console

# Check events
kubectl get events -n cloudkit-console --sort-by='.lastTimestamp'
```

**Issue:** Cannot access console

**Solution:**
```bash
# Check service
kubectl get svc cloudkit-console -n cloudkit-console

# Check route/ingress
kubectl get route cloudkit-console -n cloudkit-console
```

**Issue:** 502 Bad Gateway

**Solution:**
```bash
# Check if pods are running
kubectl get pods -n cloudkit-console

# Check pod readiness
kubectl describe pod $POD -n cloudkit-console | grep -A5 Readiness
```

### Health Checks

The application exposes health endpoints:

- `/health` - Liveness probe
- `/ready` - Readiness probe

Configure in deployment:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Updating the Deployment

### Rolling Update

```bash
# Update image
kubectl set image deployment/cloudkit-console \
  console=quay.io/eerez/cloudkit-console:NEW_TAG \
  -n cloudkit-console

# Monitor rollout
kubectl rollout status deployment/cloudkit-console -n cloudkit-console

# Rollback if needed
kubectl rollout undo deployment/cloudkit-console -n cloudkit-console
```

### Zero-Downtime Deployment

Configure rolling update strategy:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

## Security Best Practices

1. **Use non-root user**: Already configured in Dockerfile
2. **Read-only filesystem**: Add to deployment:
   ```yaml
   securityContext:
     readOnlyRootFilesystem: true
   ```
3. **Network policies**: Restrict pod-to-pod communication
4. **RBAC**: Minimize service account permissions
5. **Secrets management**: Use Kubernetes secrets for sensitive data

## Backup & Disaster Recovery

### Backup Configuration

```bash
# Backup all resources
kubectl get all,configmap,secret -n cloudkit-console -o yaml > backup.yaml
```

### Restore

```bash
kubectl apply -f backup.yaml
```

## Production Checklist

- [ ] Container image built and pushed to registry
- [ ] Keycloak configured with correct redirect URIs
- [ ] Environment variables set correctly
- [ ] Resource limits configured
- [ ] Health checks enabled
- [ ] Multiple replicas for HA
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place
- [ ] SSL/TLS certificates configured
- [ ] Network policies applied (if required)

## Next Steps

- Configure [monitoring and alerting](./MONITORING.md)
- Set up [CI/CD pipeline](./CICD.md)
- Review [security hardening](./SECURITY.md)
