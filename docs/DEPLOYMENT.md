# Deployment Guide

This guide covers deploying OSAC UI to OpenShift/Kubernetes environments.

## Prerequisites

- Kubernetes/OpenShift cluster with admin access
- Container registry access (e.g., Quay.io, Docker Hub)
- `kubectl` or `oc` CLI tools installed
- `podman` or `docker` for building images
- Fulfillment API deployed and accessible
- Keycloak instance configured with the `innabox` realm

## Deployment Environments

The project includes deployment manifests for two environments:

- **Development**: `deploy/dev/` - For testing and development
- **Integration**: `deploy/integration/` - For integration testing

## Quick Deployment

### 1. Build and Push Container Image

```bash
# Generate unique tag
export TAG=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)

# Build and push using Makefile
make build-push TAG=$TAG REGISTRY=quay.io/<your-org>
```

Or manually:

```bash
# Build
podman build -t quay.io/<your-org>/osac-ui:$TAG .

# Push
podman push quay.io/<your-org>/osac-ui:$TAG
```

### 2. Configure Environment

Edit the ConfigMap for your environment (e.g., `deploy/dev/configmap.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: osac-ui-config
data:
  FULFILLMENT_API_URL: "https://fulfillment-api.<namespace>.<cluster-domain>"
  KEYCLOAK_URL: "https://keycloak.<namespace>.<cluster-domain>"
  KEYCLOAK_REALM: "innabox"
  OIDC_CLIENT_ID: "osac-ui"
  NAMESPACE: "<your-namespace>"
  GENERIC_TEMPLATE_ID: "osac.templates.ocp_virt_vm"
```

### 3. Deploy to Cluster

```bash
# Set your kubeconfig
export KUBECONFIG=/path/to/your/kubeconfig

# Create namespace if it doesn't exist
kubectl create namespace <your-namespace>

# Apply all manifests
kubectl apply -f deploy/dev/ -n <your-namespace>

# Update deployment with your image
kubectl set image deployment/osac-ui \
  console=quay.io/<your-org>/osac-ui:$TAG \
  -n <your-namespace>
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n <your-namespace> -l app=osac-ui

# Check deployment
kubectl get deployment osac-ui -n <your-namespace>

# Check route/ingress
kubectl get route osac-ui -n <your-namespace>  # OpenShift
kubectl get ingress osac-ui -n <your-namespace>  # Kubernetes
```

### 5. Access the Application

```bash
# Get the route URL
kubectl get route osac-ui -n <your-namespace> -o jsonpath='{.spec.host}'

# Access via browser
https://<route-url>
```

## Build and Deploy in One Step

The Makefile provides a convenient target that builds, pushes, and deploys:

```bash
export TAG=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)
export KUBECONFIG=/path/to/your/kubeconfig

make build-and-deploy-image TAG=$TAG NAMESPACE=<your-namespace>
```

## Deployment Manifests

### Required Resources

1. **Deployment** (`deployment.yaml`)
   - Runs the OSAC UI container
   - Mounts ConfigMap for runtime configuration
   - Health checks on port 8080

2. **Service** (`service.yaml`)
   - Exposes the deployment internally
   - Port 8080 (HTTP)

3. **Route/Ingress** (`route.yaml`)
   - Exposes the service externally
   - TLS edge termination
   - Redirects HTTP to HTTPS

4. **ConfigMap** (`configmap.yaml`)
   - Runtime environment configuration
   - API endpoints, Keycloak settings

5. **RBAC** (`rbac.yaml`)
   - ServiceAccount for the pod
   - Permissions for token creation

6. **ConfigMaps for Data** (optional)
   - `configmap-os-images.yaml` - OS image catalog
   - `configmap-host-classes.yaml` - Host class definitions

## Environment Variables

Configure these in the ConfigMap:

| Variable | Description | Example |
|----------|-------------|---------|
| `FULFILLMENT_API_URL` | Fulfillment API endpoint | `https://fulfillment-api.example.com` |
| `KEYCLOAK_URL` | Keycloak server URL | `https://keycloak.example.com` |
| `KEYCLOAK_REALM` | Keycloak realm name | `innabox` |
| `OIDC_CLIENT_ID` | OAuth client ID | `osac-ui` |
| `NAMESPACE` | Kubernetes namespace | `osac-dev` |
| `GENERIC_TEMPLATE_ID` | Default VM template ID | `osac.templates.ocp_virt_vm` |

## Networking Requirements

### Ingress/Route Configuration

The application requires external access via HTTPS:

**OpenShift Route:**
```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: osac-ui
spec:
  to:
    kind: Service
    name: osac-ui
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

**HAProxy Configuration** (if using external load balancer):
```
frontend openshift_https
    bind *:443
    mode tcp
    tcp-request inspect-delay 5s
    tcp-request content accept if { req_ssl_hello_type 1 }

    use_backend ingress_cluster if { req_ssl_sni -i osac-ui.<namespace>.<domain> }

backend ingress_cluster
    balance roundrobin
    server worker1 <worker1-ip>:443 check
    server worker2 <worker2-ip>:443 check
```

### Required Network Access

The OSAC UI pod needs network access to:
- **Fulfillment API** - For VM/cluster management operations
- **Keycloak** - For authentication (OIDC)
- **OpenShift API** (optional) - For cluster integration features

## Health Checks

The application provides two types of health check endpoints:

### Basic Health Check

For Kubernetes liveness and readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

The basic `/health` endpoint returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-08T20:12:42.028Z"
}
```

### Deep Health Check

For comprehensive dependency validation:

```bash
# Test deep health check
curl -k https://osac-ui.<namespace>.<domain>/health?deep=true
```

Returns:
```json
{
  "status": "healthy",
  "checks": {
    "fulfillment_api": {
      "status": "healthy",
      "response_time_ms": 275,
      "http_status": 401
    },
    "keycloak": {
      "status": "healthy",
      "response_time_ms": 139,
      "http_status": 200
    }
  },
  "timestamp": "2025-12-08T20:12:42.028Z"
}
```

The deep health check validates:
- Fulfillment API reachability and response time
- Keycloak OIDC endpoint availability
- Returns HTTP 200 if healthy, 503 if degraded

## Monitoring

### Prometheus Metrics

The application exposes Prometheus-compatible metrics at `/metrics`:

```bash
# Configure Prometheus scraping
kubectl annotate pod <pod-name> \
  prometheus.io/scrape="true" \
  prometheus.io/port="8080" \
  prometheus.io/path="/metrics"
```

**ServiceMonitor for Prometheus Operator:**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: osac-ui
  namespace: <your-namespace>
spec:
  selector:
    matchLabels:
      app: osac-ui
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

**Available Metrics:**
- `osac_ui_uptime_seconds` - Application uptime
- `osac_ui_requests_total` - Total HTTP requests
- `osac_ui_requests_success` - Successful requests (2xx)
- `osac_ui_requests_client_error` - Client errors (4xx)
- `osac_ui_requests_server_error` - Server errors (5xx)
- `osac_ui_response_time_avg_ms` - Average response time
- `osac_ui_response_time_p95_ms` - 95th percentile response time
- `osac_ui_response_time_p99_ms` - 99th percentile response time
- `osac_ui_memory_usage_mb` - Memory usage
- `osac_ui_memory_total_mb` - Total memory

### Logging

The application outputs structured JSON logs to stdout:

```bash
# View logs
kubectl logs -f deployment/osac-ui -n <your-namespace>

# Query structured logs with jq
kubectl logs deployment/osac-ui -n <your-namespace> | jq '. | select(.level == "error")'
```

**Log Aggregation with Fluentd/ELK:**

The JSON format integrates seamlessly with log aggregation systems:
```json
{
  "level": "info",
  "message": "HTTP Request",
  "method": "GET",
  "path": "/api/config",
  "status": 200,
  "duration": "5ms",
  "timestamp": "2025-12-08T20:10:01.000Z"
}
```

## Scaling

The application is stateless and can be scaled horizontally:

```bash
kubectl scale deployment osac-ui --replicas=3 -n <your-namespace>
```

## Updating the Deployment

### Rolling Update

```bash
export TAG=<new-tag>

kubectl set image deployment/osac-ui \
  console=quay.io/<your-org>/osac-ui:$TAG \
  -n <your-namespace>

# Monitor rollout
kubectl rollout status deployment/osac-ui -n <your-namespace>
```

### Restart Deployment

```bash
kubectl rollout restart deployment/osac-ui -n <your-namespace>
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods -n <your-namespace> -l app=osac-ui

# View pod logs
kubectl logs -n <your-namespace> deployment/osac-ui

# Describe pod for events
kubectl describe pod -n <your-namespace> <pod-name>
```

### ImagePullBackOff Error

- Verify the image exists in the registry
- Check registry permissions (make repository public or configure pull secrets)
- Verify image tag is correct

### Configuration Issues

```bash
# Verify ConfigMap
kubectl get configmap osac-ui-config -n <your-namespace> -o yaml

# Update ConfigMap and restart
kubectl edit configmap osac-ui-config -n <your-namespace>
kubectl rollout restart deployment/osac-ui -n <your-namespace>
```

### Network Connectivity

```bash
# Test from within the pod
kubectl exec -n <your-namespace> deployment/osac-ui -- curl -k https://fulfillment-api-url

# Check service
kubectl get svc osac-ui -n <your-namespace>

# Check route/ingress
kubectl get route osac-ui -n <your-namespace>
```

## Security Considerations

1. **TLS/HTTPS**: Always use edge TLS termination
2. **Service Account**: Uses dedicated service account with minimal permissions
3. **Image Security**: Scan container images for vulnerabilities
4. **Registry Access**: Use private registries or image pull secrets for production
5. **Network Policies**: Implement network policies to restrict pod communication

## Cleanup

To remove the deployment:

```bash
kubectl delete -f deploy/dev/ -n <your-namespace>

# Or delete individual resources
kubectl delete deployment osac-ui -n <your-namespace>
kubectl delete service osac-ui -n <your-namespace>
kubectl delete route osac-ui -n <your-namespace>
kubectl delete configmap osac-ui-config -n <your-namespace>
```
