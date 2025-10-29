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
  const { loginWithCredentials } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password')
      return
    }

    setIsLoading(true)

    try {
      const result = await loginWithCredentials(username, password)
      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
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
        usernameLabel="Username"
        usernameValue={username}
        onChangeUsername={(_, value) => setUsername(value)}
        passwordLabel="Password"
        passwordValue={password}
        onChangePassword={(_, value) => setPassword(value)}
        isShowPasswordEnabled={true}
        onLoginButtonClick={handleSubmit}
        loginButtonLabel={isLoading ? 'Authenticating...' : 'Log in'}
        isLoginButtonDisabled={isLoading || !username.trim() || !password.trim()}
      />
      <div style={{ marginTop: '1.5rem', textAlign: 'left', fontSize: '0.875rem', color: '#6a6e73' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Development Login Credentials:</p>
        <div style={{
          background: '#f0f0f0',
          padding: '0.75rem',
          borderRadius: '4px',
          marginBottom: '0.5rem'
        }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <strong>Administrator:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '3px' }}>admin</code> / <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '3px' }}>admin123</code>
          </div>
          <div>
            <strong>Client:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '3px' }}>client</code> / <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '3px' }}>client123</code>
          </div>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#999', fontStyle: 'italic' }}>
          Note: Temporary development authentication. Keycloak integration coming soon.
        </p>
      </div>
    </LoginPage>
  )
}

export default Login
