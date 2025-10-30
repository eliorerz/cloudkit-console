import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  username: string | null
  role: string | null
  login: (token: string, username: string, role: string) => void
  logout: () => void
  loginWithCredentials: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hardcoded users for development (temporary until Keycloak integration is complete)
const DUMMY_USERS = {
  admin: { password: 'admin123', role: 'fulfillment-admin', namespace: 'foobar' },
  client: { password: 'client123', role: 'fulfillment-client', namespace: 'foobar' }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('cloudkit_token')
    const storedUsername = localStorage.getItem('cloudkit_username')
    const storedRole = localStorage.getItem('cloudkit_role')
    if (storedToken && storedUsername && storedRole) {
      setToken(storedToken)
      setUsername(storedUsername)
      setRole(storedRole)
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, newUsername: string, newRole: string) => {
    localStorage.setItem('cloudkit_token', newToken)
    localStorage.setItem('cloudkit_username', newUsername)
    localStorage.setItem('cloudkit_role', newRole)
    setToken(newToken)
    setUsername(newUsername)
    setRole(newRole)
    setIsAuthenticated(true)
  }

  const loginWithCredentials = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Check if user exists in our dummy user database
    const user = DUMMY_USERS[username as keyof typeof DUMMY_USERS]

    if (!user) {
      return { success: false, error: 'Invalid username or password' }
    }

    if (user.password !== password) {
      return { success: false, error: 'Invalid username or password' }
    }

    // Generate a Kubernetes ServiceAccount token by calling kubectl
    try {
      const response = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceAccount: user.role,
          namespace: user.namespace
        })
      })

      if (!response.ok) {
        return { success: false, error: 'Failed to generate token. Please try again.' }
      }

      const data = await response.json()
      login(data.token, username, user.role)
      return { success: true }
    } catch (error) {
      console.error('Token generation error:', error)
      return { success: false, error: 'Failed to generate token. Please try again.' }
    }
  }

  const logout = () => {
    localStorage.removeItem('cloudkit_token')
    localStorage.removeItem('cloudkit_username')
    localStorage.removeItem('cloudkit_role')
    setToken(null)
    setUsername(null)
    setRole(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, token, username, role, login, logout, loginWithCredentials }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
