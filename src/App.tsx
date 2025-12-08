import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { apiClient } from './api/client'
import './i18n'
import Login from './pages/Login'
import { OIDCCallback } from './pages/OIDCCallback'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { Spinner } from '@patternfly/react-core'
import { logger } from '@/utils/logger'

// Lazy load route components for better code splitting
const VirtualMachines = lazy(() => import('./pages/VirtualMachines'))
const VirtualMachineCreate = lazy(() => import('./pages/VirtualMachineCreate'))
const VirtualMachineDetail = lazy(() => import('./pages/VirtualMachineDetail'))
const BareMetalHosts = lazy(() => import('./pages/BareMetalHosts'))
const HostDetail = lazy(() => import('./pages/HostDetail'))
const Templates = lazy(() => import('./pages/Templates'))
const AdminTemplates = lazy(() => import('./pages/AdminTemplates'))
const Organizations = lazy(() => import('./pages/Organizations'))
const Hubs = lazy(() => import('./pages/Hubs'))
const ClusterTemplateCatalog = lazy(() => import('./pages/ClusterTemplateCatalog'))
const CreateClusterTemplate = lazy(() => import('./pages/CreateClusterTemplate'))
const Clusters = lazy(() => import('./pages/Clusters'))
const ClusterDetail = lazy(() => import('./pages/ClusterDetail'))
const ClusterCreate = lazy(() => import('./pages/ClusterCreate'))
const Monitoring = lazy(() => import('./pages/Monitoring'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  const [apiReady, setApiReady] = useState(false)

  // Pre-initialize API client on app startup to prevent duplicate config fetches
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        await apiClient.initialize()
        setApiReady(true)
      } catch (error) {
        logger.error('Failed to initialize API client', error)
        // Still set ready to allow app to load and show error states
        setApiReady(true)
      }
    }

    initializeAPI()
  }, [])

  if (!apiReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <Spinner size="xl" />
            </div>
          }>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<OIDCCallback />} />
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/virtual-machines"
            element={
              <ProtectedRoute>
                <VirtualMachines />
              </ProtectedRoute>
            }
          />
          <Route
            path="/virtual-machines/create"
            element={
              <ProtectedRoute>
                <VirtualMachineCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/virtual-machines/create-new"
            element={
              <ProtectedRoute>
                <VirtualMachineCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/virtual-machines/:id"
            element={
              <ProtectedRoute>
                <VirtualMachineDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bare-metal-hosts"
            element={
              <ProtectedRoute>
                <BareMetalHosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bare-metal-hosts/:id"
            element={
              <ProtectedRoute>
                <HostDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations"
            element={
              <ProtectedRoute>
                <Organizations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hubs"
            element={
              <ProtectedRoute>
                <Hubs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <ProtectedRoute>
                <AdminTemplates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cluster-catalog"
            element={
              <ProtectedRoute>
                <ClusterTemplateCatalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cluster-catalog/create"
            element={
              <ProtectedRoute>
                <CreateClusterTemplate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clusters"
            element={
              <ProtectedRoute>
                <Clusters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clusters/create"
            element={
              <ProtectedRoute>
                <ClusterCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clusters/:id"
            element={
              <ProtectedRoute>
                <ClusterDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring"
            element={
              <ProtectedRoute>
                <Monitoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
          </Routes>
          </Suspense>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
