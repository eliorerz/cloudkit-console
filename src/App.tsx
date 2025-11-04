import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './pages/Login'
import { OIDCCallback } from './pages/OIDCCallback'
import Dashboard from './pages/Dashboard'
import VirtualMachines from './pages/VirtualMachines'
import VirtualMachineDetail from './pages/VirtualMachineDetail'
import Templates from './pages/Templates'
import Organizations from './pages/Organizations'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<OIDCCallback />} />
          <Route
            path="/dashboard"
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
            path="/virtual-machines/:id"
            element={
              <ProtectedRoute>
                <VirtualMachineDetail />
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
