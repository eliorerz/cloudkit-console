import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LoginPage,
  LoginForm,
  ListVariant,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token.trim()) {
      setError('Please enter a valid token')
      return
    }

    setIsLoading(true)

    try {
      // In a real implementation, you would validate the token against the API
      // For now, we'll just store it
      login(token)
      navigate('/dashboard')
    } catch (err) {
      setError('Invalid token. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoginPage footerListVariants={ListVariant.inline} loginTitle="">
      <div className="custom-login-header">
        <img
          src="/logo.png"
          alt="CloudKit Logo"
          className="custom-logo"
        />
        <h1 className="custom-login-title">Log in to your account</h1>
        <p className="custom-login-subtitle">CloudKit Console</p>
      </div>
      {error && (
        <Alert
          variant="danger"
          title={error}
          actionClose={<AlertActionCloseButton onClose={() => setError(null)} />}
          style={{ marginBottom: '1rem' }}
        />
      )}
      <LoginForm
        showHelperText
        usernameLabel="Access Token"
        usernameValue={token}
        onChangeUsername={(_, value) => setToken(value)}
        isValidUsername={!!token.trim()}
        isShowPasswordEnabled={false}
        onLoginButtonClick={handleSubmit}
        loginButtonLabel={isLoading ? 'Authenticating...' : 'Log in'}
        isLoginButtonDisabled={isLoading || !token.trim()}
        helperText={
          <div style={{ marginTop: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#6a6e73' }}>
            <p>To obtain an access token, run:</p>
            <code style={{
              display: 'block',
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: '#f5f5f5',
              borderRadius: '3px',
              fontSize: '0.8125rem',
              fontFamily: 'monospace'
            }}>
              kubectl create token fulfillment-admin -n foobar --duration=1h
            </code>
          </div>
        }
      />
    </LoginPage>
  )
}

export default Login
