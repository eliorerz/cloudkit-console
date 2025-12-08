# OSAC UI

A modern web-based console for managing virtual machine infrastructure through the Fulfillment API, built with React and PatternFly.

![OSAC UI](./docs/images/dashboard-preview.png)

## Overview

OSAC UI provides a user-friendly interface for managing virtual machines, clusters, templates, and infrastructure resources. It features enterprise-grade authentication via Keycloak OIDC, role-based access control, and multi-tenant organization support.

## Features

### Virtual Machine Management
- Create, view, update, and delete virtual machines with full lifecycle control
- Card and table view modes with sorting and filtering
- Filter by owner, status, and hardware specifications (CPU cores)
- Real-time status updates with auto-refresh
- VM console access and detailed resource information
- Template-based VM creation with customizable parameters

### Cluster Management
- Browse and deploy OpenShift clusters from templates
- Cluster lifecycle management (create, view, monitor)
- Multi-node cluster provisioning with configurable node sets
- Real-time cluster status tracking (Draft, Installed, Progressing, Ready, Failed)
- Cluster details including API URL, console URL, and infrastructure info

### Template Library
- Browse VM and cluster templates with filtering by OS and hardware
- Template catalog with detailed configuration previews
- Quick-create VMs from templates with default parameters
- Custom template parameters for advanced configurations

### Dashboard & Monitoring
- Real-time metrics for VMs, clusters, hubs, and templates
- Resource utilization tracking (CPU, memory, storage)
- Recent activity monitoring
- Quick access to recent VMs and clusters
- Admin and client role-specific views

### Authentication & Security
- **Secure Authentication**: OpenID Connect (OIDC) integration with Keycloak
- **Role-Based Access Control**: `fulfillment-admin` and `fulfillment-client` roles
- **Organization Support**: Multi-tenant with Keycloak group-based organizations
- **Token Management**: Automatic token refresh and secure storage
- **PKCE Flow**: Authorization Code + PKCE for enhanced security

### User Experience
- **Modern UI**: Built with PatternFly 6 design system
- **Responsive Design**: Mobile-friendly and accessible (WCAG 2.1)
- **Consistent UX**: Inspired by OpenShift Console patterns
- **Real-time Updates**: Auto-refresh with configurable intervals
- **Sidebar Filters**: Advanced filtering on VMs and templates

## Quick Start

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Access to a Fulfillment API instance
- Keycloak server with the `innabox` realm configured

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/eliorerz/osac-ui.git
   cd osac-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your configuration:
   ```env
   VITE_API_BASE_URL=https://fulfillment-api.example.com
   VITE_OIDC_AUTHORITY=https://keycloak.example.com/realms/innabox
   VITE_OIDC_CLIENT_ID=osac-ui
   VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback
   ```

4. **Install CA certificates**
   ```bash
   # Required for direct browser API calls to work without certificate warnings
   ./scripts/install-ca-certificates.sh
   ```

   **Important:** Restart your browser after installing certificates.

5. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### Production Deployment

#### Using Docker/Podman

1. **Build and push the container image**
   ```bash
   TAG=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)
   make build-push TAG=$TAG
   ```

2. **Deploy to Kubernetes/OpenShift**
   ```bash
   # Apply all deployment manifests
   kubectl apply -f deploy/ -n <your-namespace>

   # Update deployment with new image
   kubectl set image deployment/osac-ui \
     console=quay.io/eerez/osac-ui:$TAG \
     -n <your-namespace>
   ```

3. **Build and deploy in one step**
   ```bash
   TAG=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)
   KUBECONFIG=/path/to/kubeconfig make build-and-deploy-image TAG=$TAG
   ```

#### Environment Configuration

The deployment uses ConfigMaps for runtime configuration:
- `FULFILLMENT_API_URL`: Backend API endpoint
- `KEYCLOAK_URL`: Keycloak SSO server
- `KEYCLOAK_REALM`: Keycloak realm (default: `innabox`)
- `OIDC_CLIENT_ID`: OAuth client ID (default: `osac-ui`)
- `NAMESPACE`: Kubernetes namespace

See [Deployment Guide](./docs/DEPLOYMENT.md) for detailed deployment instructions.

## Documentation

- [Quick Start Guide](./docs/QUICKSTART.md) - Getting started with OSAC UI
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions
- [Authentication & Authorization](./docs/AUTHENTICATION.md) - OIDC and Keycloak integration
- [Development Notes](./CLAUDE.md) - Project-specific development guidelines

## Technology Stack

### Frontend
- **React 18.2.0** - Modern UI library with hooks and functional components
- **TypeScript 5.2.2** - Type-safe development (~10,183 lines of code)
- **PatternFly 6.0.0** - Red Hat's enterprise-grade component library
  - `@patternfly/react-core` - Core UI components
  - `@patternfly/react-icons` - Icon library
  - `@patternfly/react-table` - Advanced table components
- **React Router 6.20.1** - Client-side routing and navigation
- **Vite 5.0.8** - Lightning-fast build tool and dev server with HMR

### Authentication & Authorization
- **oidc-client-ts 3.3.0** - OpenID Connect client library
- **Keycloak** - Identity and access management server
- **PKCE Flow** - Authorization Code + Proof Key for Code Exchange
- **JWT** - Token-based authentication with automatic refresh

### API Communication
- **Axios 1.6.2** - HTTP client with request/response interceptors
- **gRPC-Web 2.0.2** - Protocol buffers over HTTP
- **google-protobuf 4.0.0** - Protobuf serialization for efficient data transfer
- **REST API** - Direct browser calls to Fulfillment API
- **Real-time Updates** - Auto-refresh with configurable polling intervals

### Build & Deployment
- **Docker/Podman** - Multi-stage containerization (Alpine Linux)
- **Kubernetes/OpenShift** - Container orchestration and deployment
- **Node.js 20 (Express 4.18.2)** - Production server for serving static assets
- **kubectl** - Kubernetes CLI tools (embedded in container)

### Development Tools
- **ESLint 8.55.0** - Code linting with TypeScript support
- **TypeScript ESLint** - TypeScript-specific linting rules
- **React Hooks ESLint** - React hooks best practices enforcement

## Project Structure

```
osac-ui/
├── src/
│   ├── api/              # API client and services
│   ├── auth/             # OIDC configuration
│   ├── components/       # Reusable React components
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── pages/            # Page components
│   ├── styles/           # Global styles
│   ├── App.tsx           # Main application component
│   └── main.tsx          # Application entry point
├── public/               # Static assets
├── server/               # Express production server
├── deploy/               # Kubernetes deployment manifests
├── docs/                 # Documentation
├── Dockerfile            # Container image definition
├── Makefile              # Build automation
└── package.json          # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality
- `npm start` - Start production server (after build)

## Environment Variables

### Runtime Configuration (Server-side)
These are configured via Kubernetes ConfigMap and read by the Express server:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `FULFILLMENT_API_URL` | Fulfillment API base URL | `https://fulfillment-api-innabox-devel.apps.ostest.test.metalkube.org` |
| `KEYCLOAK_URL` | Keycloak server URL | `https://keycloak-innabox-devel.apps.ostest.test.metalkube.org` |
| `KEYCLOAK_REALM` | Keycloak realm name | `innabox` |
| `OIDC_CLIENT_ID` | OAuth client ID | `osac-ui` |
| `NAMESPACE` | Kubernetes namespace | `innabox-devel` |
| `GENERIC_TEMPLATE_ID` | Generic VM template ID | `osac.templates.ocp_virt_vm` |

### Client Configuration
The frontend retrieves runtime configuration from `/api/config` endpoint which serves the above environment variables to the browser.

### Development Environment (optional)
For local development, you can create a `.env` file:
```env
VITE_API_BASE_URL=https://fulfillment-api-innabox-devel.apps.ostest.test.metalkube.org
VITE_KEYCLOAK_URL=https://keycloak-innabox-devel.apps.ostest.test.metalkube.org
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/eliorerz/osac-ui/issues)
- Check the [documentation](./docs/)
- Contact the development team

## Acknowledgments

- Built with [PatternFly](https://www.patternfly.org/) design system
- Inspired by OpenShift Console UX patterns
- Powered by Red Hat's enterprise-grade technologies
