import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from 'oidc-client-ts'
import { loadConfig, getUserManager } from '../auth/oidcConfig'

let userManager: ReturnType<typeof getUserManager> | null = null

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  token: string | null
  username: string | null
  displayName: string | null
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
    // Listen for user loaded events (after login/silent renew)
    const handleUserLoaded = (loadedUser: User) => {
      console.log('User loaded event fired')
      setUser(loadedUser)
      setIsAuthenticated(true)
      setIsLoading(false)
    }

    // Listen for user unloaded events (after logout)
    const handleUserUnloaded = () => {
      console.log('User unloaded event fired')
      setUser(null)
      setIsAuthenticated(false)
    }

    // Listen for silent renew errors
    const handleSilentRenewError = (error: Error) => {
      console.error('Silent renew error:', error)
      // Don't automatically logout on silent renew error
      // User can still use the app until token expires
    }

    const initAuth = async () => {
      try {
        // Load runtime configuration first
        await loadConfig()

        // Initialize userManager with loaded config
        userManager = getUserManager()

        // Attach event listeners BEFORE checking for user
        // This ensures they're ready when signinRedirectCallback fires
        userManager.events.addUserLoaded(handleUserLoaded)
        userManager.events.addUserUnloaded(handleUserUnloaded)
        userManager.events.addSilentRenewError(handleSilentRenewError)

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

    return () => {
      if (userManager) {
        userManager.events.removeUserLoaded(handleUserLoaded)
        userManager.events.removeUserUnloaded(handleUserUnloaded)
        userManager.events.removeSilentRenewError(handleSilentRenewError)
      }
    }
  }, [])

  // Sync access token to localStorage for API client
  useEffect(() => {
    if (user?.access_token) {
      localStorage.setItem('cloudkit_token', user.access_token)
    } else {
      localStorage.removeItem('cloudkit_token')
    }
  }, [user])

  const login = async () => {
    if (!userManager) {
      console.error('UserManager not initialized')
      throw new Error('Authentication not ready')
    }

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
    if (!userManager) {
      console.error('UserManager not initialized')
      return
    }

    try {
      // Clear token from localStorage before logout
      localStorage.removeItem('cloudkit_token')
      // Redirect to Keycloak logout page
      await userManager.signoutRedirect()
    } catch (error) {
      console.error('Logout error:', error)
      // Even if redirect fails, clear local state
      localStorage.removeItem('cloudkit_token')
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  // Extract user information from OIDC user object
  const token = user?.access_token || null

  // Debug: Log user profile to see available fields
  if (user?.profile) {
    console.log('User profile fields:', {
      preferred_username: user.profile.preferred_username,
      username: (user.profile as any).username,
      name: user.profile.name,
      email: user.profile.email,
      sub: user.profile.sub,
      given_name: (user.profile as any).given_name,
      family_name: (user.profile as any).family_name,
      groups: (user.profile as any).groups,
      roles: (user.profile as any).roles,
      realm_access: (user.profile as any).realm_access,
      resource_access: (user.profile as any).resource_access,
    })
    console.log('Full profile object:', user.profile)
  }

  // Username (actual username from preferred_username or username field)
  const username = user?.profile?.preferred_username
    || (user?.profile as any)?.username
    || user?.profile?.email?.split('@')[0]
    || user?.profile?.sub
    || null

  // Display name (full name for display purposes)
  const displayName = user?.profile?.name
    || user?.profile?.preferred_username
    || user?.profile?.email?.split('@')[0]
    || user?.profile?.sub
    || null

  // Determine role based on groups and roles
  const groups = (user?.profile?.groups as string[]) || []
  const organizations = (user?.profile?.organizations as string[]) || groups  // organizations and groups are the same

  // Extract roles from different possible locations in the token
  const realmRoles = (user?.profile as any)?.realm_access?.roles || []
  const resourceRoles = (user?.profile as any)?.resource_access?.['cloudkit-console']?.roles || []
  const directRoles = (user?.profile as any)?.roles || []
  const allRoles = [...realmRoles, ...resourceRoles, ...directRoles]

  // User is admin if:
  // 1. They're in the /admins group (global admin), OR
  // 2. They have the organization-admin role (organization-level admin)
  const role = (groups.includes('/admins') || allRoles.includes('organization-admin'))
    ? 'fulfillment-admin'
    : 'fulfillment-client'

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        username,
        displayName,
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
