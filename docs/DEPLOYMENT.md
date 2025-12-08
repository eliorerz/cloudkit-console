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

The deployment includes health checks:

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
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
