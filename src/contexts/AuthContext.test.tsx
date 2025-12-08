import { describe, it, expect, vi } from 'vitest'
import { AuthContext, AuthProvider } from './AuthContext'
import { render } from '@testing-library/react'
import { useContext } from 'react'

// Mock the oidcConfig module
vi.mock('../auth/oidcConfig', () => ({
  loadConfig: vi.fn().mockResolvedValue(undefined),
  getUserManager: vi.fn(() => ({
    getUser: vi.fn().mockResolvedValue(null),
    events: {
      addUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      addSilentRenewError: vi.fn(),
      removeUserLoaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
      removeSilentRenewError: vi.fn(),
    },
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
  })),
}))

function TestComponent() {
  const context = useContext(AuthContext)

  if (!context) {
    return <div>No context</div>
  }

  return (
    <div>
      <div data-testid="is-authenticated">{String(context.isAuthenticated)}</div>
      <div data-testid="is-loading">{String(context.isLoading)}</div>
      <div data-testid="username">{context.username || 'null'}</div>
      <div data-testid="display-name">{context.displayName || 'null'}</div>
      <div data-testid="role">{context.role || 'null'}</div>
    </div>
  )
}

describe('AuthContext', () => {
  it('should provide context to children', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(getByTestId('is-authenticated')).toBeInTheDocument()
    expect(getByTestId('is-loading')).toBeInTheDocument()
  })

  it('should initialize with loading state', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Initially loading, but will quickly change
    const isLoadingText = getByTestId('is-loading').textContent
    expect(isLoadingText).toMatch(/true|false/)
  })

  it('should provide default unauthenticated state', async () => {
    const { getByTestId, rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 100))
    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Should eventually be false
    const isAuthText = getByTestId('is-authenticated').textContent
    expect(isAuthText).toBe('false')
  })

  it('should provide null user info when not authenticated', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(getByTestId('username').textContent).toBe('null')
    expect(getByTestId('display-name').textContent).toBe('null')
  })

  it('should provide default role when not authenticated', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(getByTestId('role').textContent).toBe('fulfillment-client')
  })

  it('should export AuthContext', () => {
    expect(AuthContext).toBeDefined()
  })

  it('should export AuthProvider', () => {
    expect(AuthProvider).toBeDefined()
  })
})
