# Quick Start Guide

This guide will help you get CloudKit Console up and running in minutes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [First Login](#first-login)
- [Basic Usage](#basic-usage)
- [Next Steps](#next-steps)

## Prerequisites

### Required

- **Node.js**: Version 20.x or later ([Download](https://nodejs.org/))
- **npm**: Comes with Node.js (or use yarn)
- **Fulfillment API**: Running instance with accessible endpoint
- **Keycloak**: Configured with `innabox` realm

### Optional

- **Docker/Podman**: For containerized deployment
- **kubectl**: For Kubernetes deployment
- **Git**: For version control

## Local Development Setup

### Step 1: Get the Code

```bash
# Clone the repository
git clone https://github.com/eliorerz/cloudkit-console.git

# Navigate to project directory
cd cloudkit-console
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including React, PatternFly, and OIDC client libraries.

### Step 3: Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Fulfillment API Configuration
VITE_API_BASE_URL=https://fulfillment-api-foobar.apps.ostest.test.metalkube.org

# Keycloak OIDC Configuration
VITE_OIDC_AUTHORITY=https://keycloak-foobar.apps.ostest.test.metalkube.org/realms/innabox
VITE_OIDC_CLIENT_ID=cloudkit-console
VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback
VITE_OIDC_SILENT_REDIRECT_URI=http://localhost:5173/silent-renew.html
VITE_OIDC_SCOPE=openid profile email groups
```

### Step 4: Start Development Server

```bash
npm run dev
```

You should see output like:

```
VITE v5.0.8  ready in 325 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### Step 5: Install CA Certificates (Required)

Since the CloudKit Console makes direct API calls from the browser to the Fulfillment API, you need to install the CA certificates to avoid certificate warnings:

```bash
# Install CA certificates to system trust store
./scripts/install-ca-certificates.sh
```

**Important:** Restart your browser after installing certificates for changes to take effect.

### Step 6: Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

You should see the CloudKit Console login page.

## First Login

### Logging In

1. Click the **"Log in with Keycloak"** button
2. You'll be redirected to the Keycloak login page
3. Enter your credentials:
   - For admin access: Use a user in the `/admins` group
   - For client access: Use any authenticated user
4. After successful authentication, you'll be redirected to the Dashboard

### Understanding Roles

CloudKit Console supports two roles:

- **fulfillment-admin**: Full access to all features including organization management
- **fulfillment-client**: Access to virtual machine management

Role is determined by Keycloak group membership:
- Users in `/admins` group → `fulfillment-admin`
- All other users → `fulfillment-client`

## Basic Usage

### Dashboard

The Dashboard provides an overview of your infrastructure:

- **Metrics Cards**: Shows counts for clusters, templates, hubs, and VMs
- **Resource Utilization**: CPU, memory, and storage usage
- **Active Operations**: Current provisioning/deprovisioning operations
- **Recent Activity**: Latest changes and events

### Virtual Machines

**Viewing VMs:**
1. Click **"Virtual Machines"** in the sidebar
2. Browse the list of VMs with their status
3. Use filters to find specific VMs

**VM Details:**
1. Click on any VM name
2. View detailed information:
   - General info (name, status, created date)
   - Resource allocation (CPU, memory)
   - Network configuration
   - Console access (if available)

**Managing VMs:**
- Start/Stop: Use action buttons for VM lifecycle control
- Delete: Remove VMs you no longer need

### Templates

**Browse Templates:**
1. Click **"Templates"** in the sidebar
2. View available VM templates
3. See template specifications (OS, resources)

**Using Templates:**
Templates can be used to create new VMs with predefined configurations.

### Organizations (Admin Only)

**View Organizations:**
1. Navigate to **Administration > Organizations**
2. See your assigned organizations
3. View user information

**Note:** Organizations are managed through Keycloak groups and cannot be created/modified directly in the console.

## Next Steps

### For Users

- **Explore the Dashboard**: Familiarize yourself with metrics and resource utilization
- **Create Virtual Machines**: Start provisioning VMs using templates
- **Monitor Operations**: Track active provisioning and deprovisioning tasks

### For Administrators

- **Review Organizations**: Check user org assignments in Keycloak
- **Configure Access**: Set up proper role assignments
- **Monitor Resources**: Keep track of overall resource utilization

### For Developers

- **Read the Architecture**: Understand the [system architecture](./ARCHITECTURE.md)
- **Review the Code**: Explore the project structure
- **Set up Development Environment**: Follow the [development guide](./DEVELOPMENT.md)
- **Contribute**: Check out the [contributing guide](./CONTRIBUTING.md)

## Troubleshooting

### Login Issues

**Problem**: Redirected to login page after authentication

**Solution**:
- Check that `VITE_OIDC_REDIRECT_URI` matches your Keycloak client configuration
- Verify the client ID is correct
- Ensure the user exists in Keycloak

**Problem**: "No token available" in token modal

**Solution**:
- Log out and log in again
- Check browser console for OIDC errors
- Verify Keycloak realm configuration

### API Connection Issues

**Problem**: Cannot load VMs or dashboard metrics

**Solution**:
- Verify `VITE_API_BASE_URL` is correct
- Check that the Fulfillment API is accessible
- Inspect network tab in browser developer tools
- Verify your token has proper permissions

**Problem**: Certificate errors when accessing API

**Solution**:
- Run the CA installation script: `./scripts/install-ca-certificates.sh`
- Restart your browser after installing certificates
- Verify certificates are installed: `trust list | grep -E "Innabox|ingress-operator"`

### Development Server Issues

**Problem**: Port 5173 already in use

**Solution**:
```bash
# Use a different port
npm run dev -- --port 3000
```

**Problem**: Dependencies not installing

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Getting Help

- **Documentation**: Check the [docs folder](../docs/)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/eliorerz/cloudkit-console/issues)
- **Logs**: Check browser console and network tab for errors

## What's Next?

- [Deployment Guide](./DEPLOYMENT.md) - Deploy to production
- [Authentication Guide](./AUTHENTICATION.md) - Configure Keycloak
- [API Integration](./API_INTEGRATION.md) - Understand API communication
- [Development Guide](./DEVELOPMENT.md) - Start contributing
