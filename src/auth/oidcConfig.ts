import { UserManager, WebStorageStateStore, Log } from 'oidc-client-ts'
import { getConfig, type AppConfig } from '../api/config'
import { logger } from '@/utils/logger'

// Enable OIDC client logging in development
if (import.meta.env.DEV) {
  Log.setLogger(console)
  Log.setLevel(Log.DEBUG)
}

// Runtime configuration - MUST be loaded before use
let runtimeConfig: AppConfig | null = null

const CONSOLE_URL = window.location.origin

// Load configuration from centralized config service
export async function loadConfig(): Promise<AppConfig> {
  // If already loaded, return it (idempotent)
  if (runtimeConfig) {
    logger.info('Config already loaded, returning cached config')
    return runtimeConfig
  }

  try {
    const config = await getConfig()

    // Validate required fields
    if (!config.keycloakUrl || !config.keycloakRealm || !config.oidcClientId) {
      throw new Error('Invalid configuration: missing required fields (keycloakUrl, keycloakRealm, oidcClientId)')
    }

    runtimeConfig = config
    logger.info('Loaded runtime config', { config })
    return config
  } catch (error) {
    const errorMsg = `FATAL: Failed to load runtime configuration. Ensure osac-ui-config ConfigMap is properly configured. Error: ${error}`
    logger.error(errorMsg, error)
    throw new Error(errorMsg)
  }
}

export function getOidcConfig() {
  if (!runtimeConfig) {
    throw new Error('FATAL: Runtime configuration not loaded. Call loadConfig() first.')
  }

  return {
    authority: `${runtimeConfig.keycloakUrl}/realms/${runtimeConfig.keycloakRealm}`,
    client_id: runtimeConfig.oidcClientId,
  redirect_uri: `${CONSOLE_URL}/callback`,
  post_logout_redirect_uri: `${CONSOLE_URL}/`,
  response_type: 'code',
  scope: 'openid profile email roles groups',

  // PKCE for security (required by our client configuration)
  code_challenge_method: 'S256' as const,

  // Token storage in localStorage
  userStore: new WebStorageStateStore({ store: window.localStorage }),

  // Automatic silent renewal
  automaticSilentRenew: true,
  silent_redirect_uri: `${CONSOLE_URL}/silent-renew.html`,

  // Token lifetimes
  accessTokenExpiringNotificationTimeInSeconds: 60,

    // Metadata
    metadata: {
      issuer: `${runtimeConfig.keycloakUrl}/realms/${runtimeConfig.keycloakRealm}`,
      authorization_endpoint: `${runtimeConfig.keycloakUrl}/realms/${runtimeConfig.keycloakRealm}/protocol/openid-connect/auth`,
      token_endpoint: `${runtimeConfig.keycloakUrl}/realms/${runtimeConfig.keycloakRealm}/protocol/openid-connect/token`,
      userinfo_endpoint: `${runtimeConfig.keycloakUrl}/realms/${runtimeConfig.keycloakRealm}/protocol/openid-connect/userinfo`,
      end_session_endpoint: `${runtimeConfig.keycloakUrl}/realms/${runtimeConfig.keycloakRealm}/protocol/openid-connect/logout`,
      jwks_uri: `${runtimeConfig.keycloakUrl}/realms/${runtimeConfig.keycloakRealm}/protocol/openid-connect/certs`,
    },
  }
}

// Singleton userManager instance
let userManagerInstance: UserManager | null = null

export function getUserManager() {
  if (!userManagerInstance) {
    userManagerInstance = new UserManager(getOidcConfig())

    // Setup event handlers when creating the instance
    userManagerInstance.events.addAccessTokenExpiring(() => {
      logger.info('Access token expiring...')
    })

    userManagerInstance.events.addAccessTokenExpired(() => {
      logger.info('Access token expired')
    })

    userManagerInstance.events.addSilentRenewError((error) => {
      logger.error('Silent renew error', error)
    })
  }
  return userManagerInstance
}
