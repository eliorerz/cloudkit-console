import { UserManager, WebStorageStateStore, Log } from 'oidc-client-ts'

// Enable OIDC client logging in development
if (import.meta.env.DEV) {
  Log.setLogger(console)
  Log.setLevel(Log.DEBUG)
}

// Runtime configuration - will be loaded from server
interface RuntimeConfig {
  keycloakUrl: string
  keycloakRealm: string
  oidcClientId: string
  fulfillmentApiUrl: string
  namespace: string
}

// Runtime configuration - MUST be loaded before use
let runtimeConfig: RuntimeConfig | null = null

const CONSOLE_URL = window.location.origin

// Load configuration from server at runtime
export async function loadConfig(): Promise<RuntimeConfig> {
  // If already loaded, return it (idempotent)
  if (runtimeConfig) {
    console.log('Config already loaded, returning cached config')
    return runtimeConfig
  }

  try {
    const response = await fetch('/api/config')
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`)
    }
    const config = await response.json()

    // Validate required fields
    if (!config.keycloakUrl || !config.keycloakRealm || !config.oidcClientId) {
      throw new Error('Invalid configuration: missing required fields (keycloakUrl, keycloakRealm, oidcClientId)')
    }

    runtimeConfig = config
    console.log('Loaded runtime config:', config)
    return config
  } catch (error) {
    const errorMsg = `FATAL: Failed to load runtime configuration from /api/config. Ensure cloudkit-console-config ConfigMap is properly configured. Error: ${error}`
    console.error(errorMsg)
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
  scope: 'openid profile email',

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
      console.log('Access token expiring...')
    })

    userManagerInstance.events.addAccessTokenExpired(() => {
      console.log('Access token expired')
    })

    userManagerInstance.events.addSilentRenewError((error) => {
      console.error('Silent renew error:', error)
    })
  }
  return userManagerInstance
}
