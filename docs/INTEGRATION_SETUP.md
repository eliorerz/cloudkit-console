# CloudKit Console - Integration Environment Setup Guide

This guide provides step-by-step instructions for setting up CloudKit Console in the integration (osac) environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Details](#environment-details)
3. [Step 1: Deploy Console to Integration](#step-1-deploy-console-to-integration)
4. [Step 2: Install CA Certificates](#step-2-install-ca-certificates)
5. [Step 3: Configure Keycloak](#step-3-configure-keycloak)
6. [Step 4: Configure Organization Admin Roles](#step-4-configure-organization-admin-roles)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Access to the osac OpenShift cluster
- KUBECONFIG file at `/home/eerez/osac.kubeconfig`
- Access to Keycloak admin console
- Keycloak admin credentials (default: admin/admin)

---

## Environment Details

| Component | Value |
|-----------|-------|
| **Namespace** | `osac` |
| **KUBECONFIG** | `/home/eerez/osac.kubeconfig` |
| **Console URL** | https://cloudkit-console-osac.apps.osac.service.demo |
| **Fulfillment API** | https://fulfillment-api-osac.apps.osac.service.demo |
| **Keycloak URL** | https://keycloak-keycloak.apps.osac.service.demo |
| **Keycloak Realm** | `osac` |
| **OIDC Client ID** | `cloudkit-console` |

---

## Step 1: Deploy Console to Integration

### 1.1 Build and Push Image

```bash
cd /home/eerez/go/src/github.com/innabox/cloudkit-console

# Build and push with unique tag
make build-push
```

### 1.2 Deploy to Integration Environment

```bash
# Set KUBECONFIG for integration cluster
export KUBECONFIG=/home/eerez/osac.kubeconfig

# Deploy using integration environment configuration
make ENV=integration deploy
```

### 1.3 Update Deployment with Latest Image

```bash
# This will update the deployment with the latest built image
make ENV=integration deploy-image
```

Or do both in one step:

```bash
export KUBECONFIG=/home/eerez/osac.kubeconfig
make ENV=integration build-and-deploy-image
```

### 1.4 Verify Deployment

```bash
# Check pod status
kubectl get pods -n osac -l app=cloudkit-console

# Check deployment
kubectl get deployment cloudkit-console -n osac

# Check route
kubectl get route cloudkit-console -n osac
```

---

## Step 2: Install CA Certificates

The integration environment uses custom CA certificates that need to be installed on your local machine to access services without certificate warnings.

### 2.1 Run CA Installation Script

```bash
cd /home/eerez/go/src/github.com/innabox/cloudkit-console

# Install certificates (requires sudo)
KUBECONFIG=/home/eerez/osac.kubeconfig \
NAMESPACE=osac \
./scripts/install-ca-certificates-integration.sh
```

### 2.2 What Gets Installed

The script installs:
- **OpenShift Ingress CA**: For browser access to routes
- **OSAC Root CA**: For backend services (extracted from `fulfillment-service-tls` secret)

### 2.3 Verify Certificate Installation

```bash
# Check certificates are in trust store
trust list | grep -E "OSAC|ingress-operator"

# Test API access (should work without certificate errors)
curl -I https://fulfillment-api-osac.apps.osac.service.demo/api/fulfillment/v1/virtual_machines
curl -I https://keycloak-keycloak.apps.osac.service.demo
```

---

## Step 3: Configure Keycloak

### Option A: Automated Configuration (Recommended)

**Note**: This only works if Keycloak is accessible from your machine.

```bash
cd /home/eerez/go/src/github.com/innabox/cloudkit-console
./scripts/configure-keycloak-integration.sh
```

### Option B: Manual UI Configuration

If the automated script fails (Keycloak not accessible), configure manually:

#### 3.1 Access Keycloak Admin Console

1. URL: https://keycloak-keycloak.apps.osac.service.demo
2. Login with admin credentials
3. Select `osac` realm

#### 3.2 Create CloudKit Console Client

1. Navigate to: **Clients** → **Create Client**
2. **General Settings**:
   - Client ID: `cloudkit-console`
   - Name: `CloudKit Console`
   - Description: `CloudKit Console Web UI - Integration Environment`
   - Client type: `OpenID Connect`
   - Click **Next**

3. **Capability config**:
   - Standard flow: ✓ **ON**
   - Direct access grants: **OFF**
   - Implicit flow: **OFF**
   - Service accounts: **OFF**
   - Click **Next**

4. **Login Settings**:
   - Root URL: `https://cloudkit-console-osac.apps.osac.service.demo`
   - Valid redirect URIs:
     - `https://cloudkit-console-osac.apps.osac.service.demo/*`
     - `http://localhost:8080/*`
     - `http://localhost:5173/*`
   - Web origins: `+`
   - Click **Save**

#### 3.3 Configure Client Settings

1. Go to **Clients** → **cloudkit-console** → **Settings** tab
2. **Advanced settings**:
   - Proof Key for Code Exchange Code Challenge Method: `S256`
   - Post Logout Redirect URIs: `https://cloudkit-console-osac.apps.osac.service.demo/*`
3. Click **Save**

#### 3.4 Configure Client Scopes

1. Go to **Client Scopes** tab
2. Click **Add client scope**
3. Select **groups** from the list
4. Choose **Default** (not Optional)
5. Click **Add**

#### 3.5 Configure Groups Mapper

1. Go to **Client Scopes** → **groups** → **Mappers** tab
2. Find and click on **groups** mapper
3. Set **Full group path** to **ON**
4. Click **Save**

#### 3.6 Add Realm Roles Mapper to Dedicated Scope

**IMPORTANT**: This step is crucial for organization admin functionality.

1. Go to **Client Scopes**
2. Find and click **cloudkit-console-dedicated**
3. Go to **Mappers** tab
4. Click **Configure a new mapper**
5. Select **User Realm Role** mapper type
6. Configure:
   - Name: `realm roles`
   - Multivalued: **ON**
   - Token Claim Name: `realm_access.roles`
   - Claim JSON Type: `String`
   - Add to ID token: **ON**
   - Add to access token: **ON**
   - Add to userinfo: **ON**
7. Click **Save**

#### 3.7 Add Client Roles Mapper to Dedicated Scope

1. In the same **cloudkit-console-dedicated** scope
2. Click **Configure a new mapper** again
3. Select **User Client Role** mapper type
4. Configure:
   - Name: `client roles`
   - Client ID: (leave empty)
   - Multivalued: **ON**
   - Token Claim Name: `resource_access.${client_id}.roles`
   - Claim JSON Type: `String`
   - Add to ID token: **ON**
   - Add to access token: **ON**
   - Add to userinfo: **ON**
5. Click **Save**

**Verification**: The `cloudkit-console-dedicated` scope should now have 2 mappers (realm roles and client roles).

---

## Step 4: Configure Organization Admin Roles

### 4.1 Understanding Roles

The console supports two types of admins:

1. **Global Admin** (`fulfillment-admin`):
   - Member of `/admins` group
   - Full access to all organizations
   - Can manage all resources

2. **Organization Admin** (`organization-admin` role):
   - Has `organization-admin` role assigned
   - Admin access for specific organization(s)
   - Scoped to their organization's resources

### 4.2 Create Organization Admin User

#### Option 1: Using Existing User

1. Go to **Users** → Select user (e.g., `foxconn.operator`)
2. **Add to Groups**:
   - Go to **Groups** tab
   - Click **Join Group**
   - Select the organization group (e.g., `/Foxconn`)
   - Click **Join**
   - Optionally add to `/admins` for group visibility

3. **Assign Role**:
   - Go to **Role mapping** tab
   - Click **Assign role**
   - Filter: Select **Filter by clients**
   - Find and select **organization-admin**
   - Click **Assign**

#### Option 2: Create New User

1. Go to **Users** → **Create new user**
2. Fill in user details:
   - Username: `<org>.operator` (e.g., `foxconn.operator`)
   - Email: (optional)
   - First name: Organization name
   - Last name: `Operator`
3. Click **Create**
4. Go to **Credentials** tab → Set password
5. Follow steps in "Option 1" to add groups and roles

### 4.3 Verify User Configuration

Check that the user has:
- ✓ Membership in organization group (e.g., `/Foxconn`)
- ✓ `organization-admin` role assigned
- ✓ Optionally in `/admins` group

---

## Verification

### 1. Access Console

Navigate to: https://cloudkit-console-osac.apps.osac.service.demo

### 2. Login

- Click **Login with Keycloak**
- Login with organization admin user (e.g., `foxconn.operator`)

### 3. Verify Admin View

After login, you should see:
- User displayed as "Organization Name Operator (admin)" (not "client")
- Access to admin features:
  - Organizations management
  - All Virtual Machines view
  - User management (if global admin)
  - Templates management

### 4. Check Browser Console

Open browser developer tools (F12) and check console logs:
- Should see "User loaded event fired"
- Should see "User profile fields" with groups and roles populated
- No authentication errors

### 5. Verify Token Contents

In browser console, expand the user profile log and verify:
- `groups`: Should include organization group path (e.g., `["/admins", "/Foxconn"]`)
- `realm_access.roles`: Should include `organization-admin` (if assigned)
- `preferred_username`: Should show correct username

---

## Troubleshooting

### Issue: "Client not found" error

**Cause**: The `cloudkit-console` client wasn't created in Keycloak.

**Solution**:
- Follow [Step 3.2](#32-create-cloudkit-console-client) to create the client
- Ensure you're in the `osac` realm (not `master`)
- Verify OIDC_CLIENT_ID in configmap matches: `cloudkit-console`

### Issue: Seeing "client" view instead of "admin" view

**Cause**: Roles not being sent in JWT token, or mappers not configured.

**Solution**:
1. Verify mappers are configured in `cloudkit-console-dedicated` scope:
   - Should have **realm roles** mapper
   - Should have **client roles** mapper
2. Follow [Step 3.6](#36-add-realm-roles-mapper-to-dedicated-scope) and [Step 3.7](#37-add-client-roles-mapper-to-dedicated-scope)
3. **Log out completely** from console
4. **Clear browser cache/localStorage**
5. **Log back in** (fresh login required to get new token with roles)

### Issue: Certificate errors when accessing services

**Cause**: CA certificates not installed or not trusted.

**Solution**:
- Run the CA installation script again: [Step 2](#step-2-install-ca-certificates)
- Restart your browser after installing certificates
- Check trust store: `trust list | grep -E "OSAC|ingress"`

### Issue: "Invalid redirect URI" error

**Cause**: Redirect URIs not properly configured in Keycloak client.

**Solution**:
- Go to **Clients** → **cloudkit-console** → **Settings**
- Ensure Valid redirect URIs includes:
  - `https://cloudkit-console-osac.apps.osac.service.demo/*`
  - `http://localhost:8080/*` (for local development)
- Ensure Web origins is set to `+`

### Issue: Groups not showing in token

**Cause**: Groups mapper not configured or not set to full path.

**Solution**:
- Go to **Client Scopes** → **groups** → **Mappers**
- Edit **groups** mapper
- Set **Full group path** to **ON**
- Save and log out/in again

### Issue: Deployment not updating

**Cause**: Image not being pulled or wrong image tag.

**Solution**:
```bash
# Check current image
kubectl get deployment cloudkit-console -n osac -o jsonpath='{.spec.template.spec.containers[0].image}'

# Force rollout restart
kubectl rollout restart deployment/cloudkit-console -n osac

# Watch rollout status
kubectl rollout status deployment/cloudkit-console -n osac
```

---

## Additional Resources

- [Keycloak Manual Setup Guide](../scripts/KEYCLOAK_MANUAL_SETUP.md)
- [OpenID Connect Documentation](https://openid.net/connect/)
- [Keycloak Documentation](https://www.keycloak.org/docs/latest/)

---

## Notes

- Always use the `/admins` group for global administrators
- Organization admins should have the `organization-admin` role assigned
- Users must log out and back in after role/group changes
- The `cloudkit-console-dedicated` scope is automatically created by Keycloak and requires manual mapper configuration
- Certificate installation requires sudo privileges
- Integration environment deployment configurations are in `deploy/integration/`
- Dev environment deployment configurations are in `deploy/dev/`

---

## Quick Reference Commands

```bash
# Build and deploy to integration
export KUBECONFIG=/home/eerez/osac.kubeconfig
make ENV=integration build-and-deploy-image

# Check deployment status
kubectl get pods -n osac -l app=cloudkit-console
kubectl logs -n osac -l app=cloudkit-console --tail=100

# Restart deployment
kubectl rollout restart deployment/cloudkit-console -n osac

# Install CA certificates
KUBECONFIG=/home/eerez/osac.kubeconfig NAMESPACE=osac \
./scripts/install-ca-certificates-integration.sh

# Configure Keycloak (if accessible)
./scripts/configure-keycloak-integration.sh
```
