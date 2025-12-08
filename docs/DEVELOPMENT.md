# Development Guide

This guide covers local development setup, project structure, and development workflows for OSAC UI.

## Prerequisites

- **Node.js**: 20.x or later
- **npm**: 10.x or later (comes with Node.js)
- **Git**: For version control
- **Code Editor**: VS Code recommended
- **Access**: Fulfillment API and Keycloak instances (can be remote)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/osac-ui.git
cd osac-ui
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- React 18.2.0
- TypeScript 5.2.2
- PatternFly 6.0.0
- Vite 5.0.8
- React Router 6.20.1
- Axios 1.6.2
- oidc-client-ts 3.3.0

### 3. Configure Environment

The application uses runtime configuration (loaded from server), but for local development you can optionally create a `.env` file:

```bash
# Optional - for development convenience
VITE_API_BASE_URL=https://fulfillment-api.example.com
VITE_KEYCLOAK_URL=https://keycloak.example.com
```

**Note:** In production, configuration is served by the Express server from environment variables, not `.env` files.

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (Vite's default port).

## Available Scripts

### Development

```bash
npm run dev
```
Starts Vite development server with hot module replacement (HMR) on port 5173.

### Production Build

```bash
npm run build
```
Creates optimized production build in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```
Serves the production build locally for testing.

### Linting

```bash
npm run lint
```
Runs ESLint to check code quality and style.

### Production Server

```bash
npm start
```
Starts Express production server on port 8080. Requires running `npm run build` first.

## Project Structure

```
osac-ui/
├── src/
│   ├── api/                    # API client and service layer
│   │   ├── client.ts          # Axios client with interceptors
│   │   ├── config.ts          # Runtime config loader
│   │   ├── virtualMachines.ts # VM API methods
│   │   ├── clusters.ts        # Cluster API methods
│   │   ├── templates.ts       # Template API methods
│   │   └── types.ts           # TypeScript interfaces
│   │
│   ├── auth/                   # Authentication
│   │   └── oidcConfig.ts      # Keycloak OIDC configuration
│   │
│   ├── components/             # Reusable React components
│   │   ├── layouts/           # Layout components
│   │   │   └── AppLayout.tsx  # Main application layout
│   │   └── ...                # Feature-specific components
│   │
│   ├── contexts/               # React Context providers
│   │   └── AuthContext.tsx    # Authentication context
│   │
│   ├── pages/                  # Page components (routes)
│   │   ├── Dashboard.tsx      # Dashboard page
│   │   ├── VirtualMachines.tsx
│   │   ├── Clusters.tsx
│   │   ├── Templates.tsx
│   │   ├── Login.tsx
│   │   ├── OIDCCallback.tsx   # OAuth callback handler
│   │   └── ...
│   │
│   ├── locales/                # Internationalization
│   │   ├── en/                # English translations
│   │   ├── zh/                # Chinese (Simplified)
│   │   ├── zh-TW/             # Chinese (Traditional)
│   │   ├── es/                # Spanish
│   │   └── pt-BR/             # Portuguese (Brazil)
│   │
│   ├── styles/                 # Global styles
│   │   └── index.css
│   │
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Application entry point
│   └── vite-env.d.ts          # Vite TypeScript declarations
│
├── server/                     # Express production server
│   └── index.js               # Server entry point
│
├── public/                     # Static assets
│   ├── logo.png
│   ├── silent-renew.html      # OIDC silent token renewal
│   └── ...
│
├── deploy/                     # Kubernetes manifests
│   ├── dev/                   # Development environment
│   └── integration/           # Integration environment
│
├── docs/                       # Documentation
│
├── Dockerfile                  # Container image definition
├── Makefile                   # Build automation
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── eslint.config.js           # ESLint configuration
└── README.md                  # Project overview
```

## Code Organization

### API Layer (`src/api/`)

Centralized API client with type-safe methods:

```typescript
// Example: Virtual Machine API
export async function getVirtualMachines(): Promise<VirtualMachine[]> {
  const response = await apiClient.get('/api/fulfillment/v1/virtual_machines')
  return response.data.virtual_machines || []
}

export async function createVirtualMachine(vm: CreateVMRequest): Promise<VirtualMachine> {
  const response = await apiClient.post('/api/fulfillment/v1/virtual_machines', vm)
  return response.data
}
```

### Authentication (`src/auth/`, `src/contexts/`)

OIDC-based authentication with Keycloak:

```typescript
// Load config from server
const config = await loadConfig()

// Initialize UserManager
const userManager = new UserManager(getOidcConfig())

// Use in components
const { isAuthenticated, user, login, logout } = useAuth()
```

### Components (`src/components/`)

Reusable PatternFly-based components:

```typescript
import { Button, Card, Title } from '@patternfly/react-core'

export const MyComponent: React.FC = () => {
  return (
    <Card>
      <CardBody>
        <Title headingLevel="h2">My Title</Title>
        <Button variant="primary">Action</Button>
      </CardBody>
    </Card>
  )
}
```

### Pages (`src/pages/`)

Route-level components:

```typescript
// src/pages/Dashboard.tsx
const Dashboard: React.FC = () => {
  const [vms, setVms] = useState<VirtualMachine[]>([])

  useEffect(() => {
    getVirtualMachines().then(setVms)
  }, [])

  return (
    <AppLayout>
      <PageSection>
        {/* Dashboard content */}
      </PageSection>
    </AppLayout>
  )
}
```

## Configuration

### TypeScript Configuration

The project uses strict TypeScript settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "jsx": "react-jsx"
  }
}
```

### Vite Configuration

Custom Vite setup for development:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/config': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

### ESLint Configuration

Code quality rules:

```javascript
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
]
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-new-feature
```

### 2. Make Changes

Edit files in `src/` directory. The dev server will hot-reload changes automatically.

### 3. Test Locally

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Test production build
npm run preview
```

### 4. Commit Changes

```bash
git add .
git commit -m "Add new feature: description"
```

### 5. Build Container Image

```bash
export TAG=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)
make build-push TAG=$TAG
```

## Adding New Features

### Adding a New Page

1. Create component in `src/pages/`:
```typescript
// src/pages/MyNewPage.tsx
import React from 'react'
import AppLayout from '../components/layouts/AppLayout'
import { PageSection, Title } from '@patternfly/react-core'

const MyNewPage: React.FC = () => {
  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1">My New Page</Title>
        {/* Content */}
      </PageSection>
    </AppLayout>
  )
}

export default MyNewPage
```

2. Add route in `src/App.tsx`:
```typescript
import MyNewPage from './pages/MyNewPage'

<Route path="/my-new-page" element={<MyNewPage />} />
```

3. Add navigation item in `src/components/layouts/AppLayout.tsx`:
```typescript
<NavItem to="/my-new-page">
  My New Page
</NavItem>
```

### Adding a New API Method

1. Define TypeScript interface in `src/api/types.ts`:
```typescript
export interface MyResource {
  id: string
  name: string
  status: string
}
```

2. Add API method in appropriate file:
```typescript
// src/api/myResources.ts
export async function getMyResources(): Promise<MyResource[]> {
  const response = await apiClient.get('/api/my-resources')
  return response.data.resources || []
}
```

3. Use in component:
```typescript
import { getMyResources } from '../api/myResources'

const [resources, setResources] = useState<MyResource[]>([])

useEffect(() => {
  getMyResources().then(setResources)
}, [])
```

### Adding Translations

1. Add keys to all language files:

```json
// src/locales/en/myFeature.json
{
  "title": "My Feature",
  "description": "Feature description"
}

// src/locales/zh/myFeature.json
{
  "title": "我的功能",
  "description": "功能描述"
}
```

2. Import and use in component:
```typescript
import { useTranslation } from 'react-i18next'

const { t } = useTranslation('myFeature')
return <Title>{t('title')}</Title>
```

## Debugging

### Browser DevTools

- **React DevTools**: Inspect component state and props
- **Network Tab**: Monitor API calls and responses
- **Console**: View application logs and errors
- **Application Tab**: Inspect localStorage (tokens)

### VS Code Debugging

Add `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### Common Issues

**Port Already in Use:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Module Not Found:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Type Errors:**
```bash
# Check TypeScript errors
npx tsc --noEmit
```

## Performance Optimization

### Code Splitting

Use React lazy loading for large components:

```typescript
import { lazy, Suspense } from 'react'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<div>Loading...</div>}>
  <HeavyComponent />
</Suspense>
```

### Memoization

Optimize re-renders with React hooks:

```typescript
import { useMemo, useCallback } from 'react'

const expensiveValue = useMemo(() => computeExpensiveValue(data), [data])
const handleClick = useCallback(() => doSomething(), [])
```

### Bundle Analysis

Analyze bundle size:

```bash
npm run build
# Check dist/ folder size
du -sh dist/*
```

## Testing

### Manual Testing Checklist

- [ ] Login/Logout flow works
- [ ] All navigation links work
- [ ] API calls return expected data
- [ ] Error handling works
- [ ] Responsive design on mobile
- [ ] Browser compatibility (Chrome, Firefox, Safari)

### Browser Compatibility

Tested and supported browsers:
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## Contributing

1. Follow existing code style
2. Use TypeScript for type safety
3. Add translations for new text
4. Test in multiple browsers
5. Run linter before committing
6. Write descriptive commit messages

## Getting Help

- Check existing documentation in `docs/`
- Review README.md for project overview
- Inspect existing code for patterns
- Check browser console for errors
- Review API responses in Network tab
