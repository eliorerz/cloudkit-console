import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './pages/Login'
import { OIDCCallback } from './pages/OIDCCallback'
import Dashboard from './pages/Dashboard'
import VirtualMachines from './pages/VirtualMachines'
import VirtualMachineCreate from './pages/VirtualMachineCreate'
import VirtualMachineDetail from './pages/VirtualMachineDetail'
import BareMetalHosts from './pages/BareMetalHosts'
import Templates from './pages/Templates'
import AdminTemplates from './pages/AdminTemplates'
import Organizations from './pages/Organizations'
import Hubs from './pages/Hubs'
import ClusterTemplateCatalog from './pages/ClusterTemplateCatalog'
import Clusters from './pages/Clusters'
import ClusterDetail from './pages/ClusterDetail'
import ClusterCreate from './pages/ClusterCreate'
import Monitoring from './pages/Monitoring'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
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
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
