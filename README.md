# CloudKit Console

A modern web-based console for managing virtual machine infrastructure through the Fulfillment API, built with React and PatternFly.

![CloudKit Console](./docs/images/dashboard-preview.png)

## Overview

CloudKit Console provides a user-friendly interface for managing virtual machines, clusters, templates, and infrastructure resources. It features enterprise-grade authentication via Keycloak OIDC, role-based access control, and multi-tenant organization support.

## Features

- **Virtual Machine Management**: Create, view, update, and delete virtual machines with full lifecycle control
- **Template Library**: Browse and manage virtual machine templates
- **Dashboard**: Real-time metrics and resource utilization monitoring
- **Organization Management**: Multi-tenant support with Keycloak group-based organizations
- **Secure Authentication**: OpenID Connect (OIDC) integration with Keycloak
- **Role-Based Access Control**: Admin and client role differentiation
- **Responsive Design**: Built with PatternFly 6 for a modern, accessible UI

## Quick Start

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Access to a Fulfillment API instance
- Keycloak server with the `innabox` realm configured

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/eliorerz/cloudkit-console.git
   cd cloudkit-console
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
   VITE_OIDC_CLIENT_ID=cloudkit-console
   VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

### Production Deployment

#### Using Docker/Podman

1. **Build the container image**
   ```bash
   make build-push
   ```

2. **Deploy to Kubernetes/OpenShift**
   ```bash
   kubectl apply -f deploy/ -n <your-namespace>
   ```

See [Deployment Guide](./docs/DEPLOYMENT.md) for detailed deployment instructions.

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Quick Start Guide](./docs/QUICKSTART.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Authentication & Authorization](./docs/AUTHENTICATION.md)
- [API Integration](./docs/API_INTEGRATION.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Contributing](./docs/CONTRIBUTING.md)

## Technology Stack

### Frontend
- **React 18**: Modern UI library with hooks
- **TypeScript**: Type-safe development
- **PatternFly 6**: Enterprise-grade component library
- **React Router 6**: Client-side routing
- **Vite**: Fast build tool and dev server

### Authentication
- **oidc-client-ts**: OpenID Connect client library
- **Keycloak**: Identity and access management

### API Communication
- **Axios**: HTTP client with interceptors
- **REST API**: Integration with Fulfillment API

### Build & Deployment
- **Docker/Podman**: Containerization
- **Kubernetes/OpenShift**: Orchestration
- **Node.js Express**: Production server

## Project Structure

```
cloudkit-console/
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

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Fulfillment API base URL | `/api` |
| `VITE_OIDC_AUTHORITY` | Keycloak realm URL | Required |
| `VITE_OIDC_CLIENT_ID` | OAuth client ID | `cloudkit-console` |
| `VITE_OIDC_REDIRECT_URI` | OAuth callback URL | Required |
| `VITE_OIDC_SILENT_REDIRECT_URI` | Silent token renewal URL | `/silent-renew.html` |
| `VITE_OIDC_SCOPE` | OAuth scopes | `openid profile email groups` |

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/eliorerz/cloudkit-console/issues)
- Check the [documentation](./docs/)
- Contact the development team

## Acknowledgments

- Built with [PatternFly](https://www.patternfly.org/) design system
- Inspired by OpenShift Console UX patterns
- Powered by Red Hat's enterprise-grade technologies
