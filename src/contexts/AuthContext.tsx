import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from 'oidc-client-ts'
import { userManager } from '../auth/oidcConfig'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  token: string | null
  username: string | null
  role: string | null
  groups: string[]
  organizations: string[]
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get the current user from storage
        const currentUser = await userManager.getUser()

        if (currentUser && !currentUser.expired) {
          setUser(currentUser)
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen for user loaded events (after login/silent renew)
    const handleUserLoaded = (loadedUser: User) => {
      setUser(loadedUser)
      setIsAuthenticated(true)
      setIsLoading(false)
    }

    // Listen for user unloaded events (after logout)
    const handleUserUnloaded = () => {
      setUser(null)
      setIsAuthenticated(false)
    }

    // Listen for silent renew errors
    const handleSilentRenewError = (error: Error) => {
      console.error('Silent renew error:', error)
      // Don't automatically logout on silent renew error
      // User can still use the app until token expires
    }

    userManager.events.addUserLoaded(handleUserLoaded)
    userManager.events.addUserUnloaded(handleUserUnloaded)
    userManager.events.addSilentRenewError(handleSilentRenewError)

    return () => {
      userManager.events.removeUserLoaded(handleUserLoaded)
      userManager.events.removeUserUnloaded(handleUserUnloaded)
      userManager.events.removeSilentRenewError(handleSilentRenewError)
    }
  }, [])

  const login = async () => {
    try {
      // Get the return URL - default to dashboard if on login page
      const returnUrl = window.location.pathname === '/login'
        ? '/dashboard'
        : window.location.pathname

      // Redirect to Keycloak login page
      await userManager.signinRedirect({
        state: { returnUrl }
      })
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Redirect to Keycloak logout page
      await userManager.signoutRedirect()
    } catch (error) {
      console.error('Logout error:', error)
      // Even if redirect fails, clear local state
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  // Extract user information from OIDC user object
  const token = user?.access_token || null
  const username = user?.profile?.preferred_username || null

  // Determine role based on groups
  const groups = (user?.profile?.groups as string[]) || []
  const organizations = (user?.profile?.organizations as string[]) || groups  // organizations and groups are the same
  const role = groups.includes('/admins') ? 'fulfillment-admin' : 'fulfillment-client'

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        username,
        role,
        groups,
        organizations,
        login,
        logout,
      }}
    >
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
