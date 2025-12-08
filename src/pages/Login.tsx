import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LoginPage,
  ListVariant,
  Alert,
  AlertActionCloseButton,
  Button,
} from '@patternfly/react-core'
import { useAuth } from '../hooks/useAuth'
import './Login.css'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/overview')
    return null
  }

  const handleKeycloakLogin = async () => {
    setError(null)
    setIsLoading(true)

    try {
      await login()
    } catch (err) {
      setError('Failed to redirect to login page. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <LoginPage footerListVariants={ListVariant.inline} loginTitle="">
      <div className="custom-login-header">
        <img
          src="/logo.png"
          alt="OSAC Logo"
          className="custom-logo"
        />
        <h1 className="custom-login-title">Log in to your account</h1>
        <p className="custom-login-subtitle">
          Open Sovereign AI Cloud
        </p>
      </div>
      {error && (
        <Alert
          variant="danger"
          title={error}
          actionClose={<AlertActionCloseButton onClose={() => setError(null)} />}
          style={{ marginBottom: '1rem' }}
        />
      )}
      <div style={{ marginTop: '2rem' }}>
        <Button
          variant="primary"
          isBlock
          onClick={handleKeycloakLogin}
          isLoading={isLoading}
          isDisabled={isLoading}
        >
          {isLoading ? 'Redirecting to login...' : 'Log in with Keycloak'}
        </Button>
      </div>
      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6a6e73' }}>
        <p style={{ marginBottom: '0.5rem' }}>
          Use your Keycloak credentials to access the Open Sovereign AI Cloud.
        </p>
      </div>
    </LoginPage>
  )
}

export default Login
