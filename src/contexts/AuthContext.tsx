import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { User } from 'oidc-client-ts'
import { loadConfig, getUserManager } from '../auth/oidcConfig'
import { logger } from '@/utils/logger'

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

// Context must be exported from the same file as the Provider for React Context pattern
/* eslint-disable react-refresh/only-export-components */
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state on mount
  useEffect(() => {
    // Listen for user loaded events (after login/silent renew)
    const handleUserLoaded = (loadedUser: User) => {
      logger.info('User loaded event fired')
      setUser(loadedUser)
      setIsAuthenticated(true)
      setIsLoading(false)
    }

    // Listen for user unloaded events (after logout)
    const handleUserUnloaded = () => {
      logger.info('User unloaded event fired')
      setUser(null)
      setIsAuthenticated(false)
    }

    // Listen for silent renew errors
    const handleSilentRenewError = (error: Error) => {
      logger.error('Silent renew error', error)
      // Don't automatically logout on silent renew error
      // User can still use the app until token expires
    }

    const initAuth = async () => {
      try {
        logger.debug('Starting auth initialization')

        // Load runtime configuration first
        await loadConfig()
        logger.debug('Runtime configuration loaded')

        // Initialize userManager with loaded config
        userManager = getUserManager()
        logger.debug('UserManager initialized')

        // Attach event listeners BEFORE checking for user
        // This ensures they're ready when signinRedirectCallback fires
        userManager.events.addUserLoaded(handleUserLoaded)
        userManager.events.addUserUnloaded(handleUserUnloaded)
        userManager.events.addSilentRenewError(handleSilentRenewError)
        logger.debug('Auth event listeners attached')

        // Try to get the current user from storage
        const currentUser = await userManager.getUser()

        if (currentUser && !currentUser.expired) {
          logger.info('User session restored from storage', {
            username: currentUser.profile?.preferred_username,
            expiresAt: currentUser.expires_at ? new Date(currentUser.expires_at * 1000).toISOString() : 'unknown'
          })
          setUser(currentUser)
          setIsAuthenticated(true)
        } else {
          logger.debug('No valid user session found in storage', {
            hasUser: !!currentUser,
            expired: currentUser?.expired
          })
          setIsAuthenticated(false)
        }
      } catch (error) {
        logger.error('Auth initialization error', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
        logger.debug('Auth initialization complete')
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
      localStorage.setItem('osac_ui_token', user.access_token)
    } else {
      localStorage.removeItem('osac_ui_token')
    }
  }, [user])

  const login = async () => {
    if (!userManager) {
      logger.error('UserManager not initialized')
      throw new Error('Authentication not ready')
    }

    try {
      // Get the return URL - default to dashboard if on login page
      const returnUrl = window.location.pathname === '/login'
        ? '/dashboard'
        : window.location.pathname

      logger.info('Initiating login redirect', { returnUrl })

      // Redirect to Keycloak login page
      await userManager.signinRedirect({
        state: { returnUrl }
      })
    } catch (error) {
      logger.error('Login error', error)
      throw error
    }
  }

  const logout = async () => {
    if (!userManager) {
      logger.error('UserManager not initialized')
      return
    }

    try {
      logger.info('Initiating logout')

      // Clear token from localStorage before logout
      localStorage.removeItem('osac_ui_token')

      // Redirect to Keycloak logout page
      await userManager.signoutRedirect()

      logger.debug('Logout redirect completed')
    } catch (error) {
      logger.error('Logout error', error)
      // Even if redirect fails, clear local state
      localStorage.removeItem('osac_ui_token')
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  // Extract user information from OIDC user object
  const token = user?.access_token || null

  // Username (actual username from preferred_username or username field)
  const profile = user?.profile as Record<string, unknown> | undefined
  const username = user?.profile?.preferred_username
    || (profile?.username as string | undefined)
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
  const groups = (profile?.groups as string[] | undefined) || []
  const organizations = (profile?.organizations as string[] | undefined) || groups  // organizations and groups are the same

  // Extract roles from different possible locations in the token
  const realmAccess = profile?.realm_access as { roles?: string[] } | undefined
  const resourceAccess = profile?.resource_access as Record<string, { roles?: string[] }> | undefined
  const realmRoles = realmAccess?.roles || []
  const resourceRoles = resourceAccess?.['cloudkit-console']?.roles || []
  const directRoles = (profile?.roles as string[] | undefined) || []
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
