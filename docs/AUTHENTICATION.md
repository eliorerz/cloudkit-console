# Authentication & Authorization

This document explains how CloudKit Console handles authentication and authorization using Keycloak and OIDC.

## Overview

CloudKit Console uses **OpenID Connect (OIDC)** for authentication, integrating with Keycloak as the identity provider. This provides enterprise-grade security with features like:

- Single Sign-On (SSO)
- Multi-factor authentication (if configured in Keycloak)
- Automatic token renewal
- Secure session management

## Authentication Flow

### 1. Initial Login

```
User → CloudKit Console → Keycloak Login Page
                    ↓
            User Authenticates
                    ↓
      Keycloak → Authorization Code
                    ↓
   CloudKit Console → Exchange for Tokens
                    ↓
            Store Tokens & Redirect
```

### 2. OIDC Authorization Code Flow with PKCE

CloudKit Console implements the **Authorization Code Flow with PKCE** (Proof Key for Code Exchange) for enhanced security:

1. User clicks "Log in with Keycloak"
2. App generates code verifier and challenge
3. User redirected to Keycloak with challenge
4. User authenticates with Keycloak
5. Keycloak redirects back with authorization code
6. App exchanges code + verifier for tokens
7. Tokens stored in browser (via oidc-client-ts)
8. User redirected to Dashboard

### 3. Token Management

**Access Token:**
- Short-lived JWT token (typically 5-15 minutes)
- Included in all API requests via `Authorization: Bearer` header
- Contains user claims (username, groups, roles)

**Refresh Token:**
- Longer-lived token (typically hours/days)
- Used to obtain new access tokens
- Stored securely by oidc-client-ts

**ID Token:**
- Contains user profile information
- Used for display purposes (username, email)

### 4. Silent Token Renewal

CloudKit Console automatically renews tokens before expiration using a hidden iframe:

1. Token approaching expiration (monitored by oidc-client-ts)
2. Hidden iframe loads `/silent-renew.html`
3. Iframe initiates silent OIDC flow
4. New tokens obtained without user interaction
5. Session continues seamlessly

## Authorization & Roles

### Role Determination

User roles are determined by Keycloak group membership:

```typescript
const groups = user.profile.groups // From OIDC token
const role = groups.includes('/admins')
  ? 'fulfillment-admin'
  : 'fulfillment-client'
```

### Role Capabilities

**fulfillment-admin:**
- Full access to all features
- Organization management (view only - managed in Keycloak)
- Virtual machine management
- Template management
- Dashboard and metrics
- Administrative navigation section

**fulfillment-client:**
- Virtual machine management
- Template browsing
- Dashboard and metrics
- No organization management access

### Organizations (Multi-Tenancy)

Organizations are represented by Keycloak groups:

- Users can belong to multiple groups
- Groups map directly to organizations
- `/admins` group has special admin privileges
- Organizations visible in UI under Administration section

## Keycloak Configuration

### Required Realm: `innabox`

The console expects a Keycloak realm named `innabox` with the following configuration:

### Client Configuration

**Client ID:** `cloudkit-console`

**Client Settings:**
```json
{
  "clientId": "cloudkit-console",
  "enabled": true,
  "publicClient": true,
  "redirectUris": [
    "http://localhost:5173/callback",
    "https://cloudkit-console-foobar.apps.ostest.test.metalkube.org/callback"
  ],
  "webOrigins": [
    "http://localhost:5173",
    "https://cloudkit-console-foobar.apps.ostest.test.metalkube.org"
  ],
  "protocol": "openid-connect",
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```

### Required Scopes

The following scopes must be available:

- `openid` - Required for OIDC
- `profile` - User profile information
- `email` - User email address
- `groups` - Group membership (for organizations)

### Group Configuration

Create groups for organizations:

```
/admins                 # Admin users
/organization-name      # Regular organization
/another-org           # Another organization
```

### User Configuration

Assign users to appropriate groups:

1. Navigate to Users in Keycloak admin
2. Select user
3. Go to Groups tab
4. Join desired groups

## OIDC Configuration

### Environment Variables

```env
# Keycloak realm URL
VITE_OIDC_AUTHORITY=https://keycloak.example.com/realms/innabox

# OAuth client ID
VITE_OIDC_CLIENT_ID=cloudkit-console

# Callback URL after login
VITE_OIDC_REDIRECT_URI=https://console.example.com/callback

# Silent renewal URL
VITE_OIDC_SILENT_REDIRECT_URI=https://console.example.com/silent-renew.html

# Requested scopes
VITE_OIDC_SCOPE=openid profile email groups
```

### oidc-client-ts Configuration

The OIDC client is configured in `src/auth/oidcConfig.ts`:

```typescript
export const oidcConfig: UserManagerSettings = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI,
  silent_redirect_uri: import.meta.env.VITE_OIDC_SILENT_REDIRECT_URI,
  scope: import.meta.env.VITE_OIDC_SCOPE,
  response_type: 'code',
  automaticSilentRenew: true,
  loadUserInfo: true,
}
```

## Security Considerations

### Token Storage

- Tokens managed by oidc-client-ts library
- Stored in browser sessionStorage (not localStorage)
- Cleared on logout or browser close
- Never exposed in URLs or logs

### API Security

All API requests include the access token:

```typescript
this.client.interceptors.request.use((config) => {
  const token = localStorage.getItem('cloudkit_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### Protected Routes

All application routes except login are protected:

```typescript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

The `ProtectedRoute` component:
- Checks authentication status
- Redirects to login if not authenticated
- Shows loading state while checking

## Logout

The logout process:

1. User clicks "Logout" in dropdown
2. App calls `userManager.signoutRedirect()`
3. User redirected to Keycloak logout
4. Keycloak clears session
5. User redirected back to login page
6. Local tokens cleared

## Troubleshooting

### Common Issues

**Issue:** Stuck in login loop

**Cause:** Redirect URI mismatch

**Solution:** Verify `VITE_OIDC_REDIRECT_URI` matches Keycloak client configuration

---

**Issue:** "No token available"

**Cause:** Token not properly stored after login

**Solution:**
- Check browser console for OIDC errors
- Verify Keycloak client configuration
- Clear browser storage and try again

---

**Issue:** Tokens expire too quickly

**Cause:** Default Keycloak token lifetimes

**Solution:** Adjust token lifetimes in Keycloak:
- Realm Settings → Tokens
- Increase Access Token Lifespan
- Increase SSO Session Idle/Max

---

**Issue:** Silent renewal failing

**Cause:** `/silent-renew.html` not accessible

**Solution:**
- Verify file exists in `public/`
- Check web server serves static files
- Verify CORS configuration

## References

- [OpenID Connect Specification](https://openid.net/connect/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [oidc-client-ts Library](https://github.com/authts/oidc-client-ts)
- [OAuth 2.0 PKCE](https://tools.ietf.org/html/rfc7636)
