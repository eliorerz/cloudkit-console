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

// Fallback configuration
let runtimeConfig: RuntimeConfig = {
  keycloakUrl: 'https://keycloak-foobar.apps.ostest.test.metalkube.org',
  keycloakRealm: 'innabox',
  oidcClientId: 'cloudkit-console',
  fulfillmentApiUrl: 'https://fulfillment-api-foobar.apps.ostest.test.metalkube.org',
  namespace: 'innabox-devel'
}

const CONSOLE_URL = window.location.origin

// Load configuration from server at runtime
export async function loadConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch('/api/config')
    const config = await response.json()
    runtimeConfig = config
    console.log('Loaded runtime config:', config)
    return config
  } catch (error) {
    console.warn('Failed to load runtime config, using fallback:', error)
    return runtimeConfig
  }
}

export function getOidcConfig() {
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

export function getUserManager() {
  return new UserManager(getOidcConfig())
}

// Initialize with fallback config
export let userManager = getUserManager()

// Handle token expiration
userManager.events.addAccessTokenExpiring(() => {
  console.log('Access token expiring...')
})

userManager.events.addAccessTokenExpired(() => {
  console.log('Access token expired')
})

// Handle silent renew errors
userManager.events.addSilentRenewError((error) => {
  console.error('Silent renew error:', error)
})
