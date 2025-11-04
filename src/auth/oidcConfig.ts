import { UserManager, WebStorageStateStore, Log } from 'oidc-client-ts'

// Enable OIDC client logging in development
if (import.meta.env.DEV) {
  Log.setLogger(console)
  Log.setLevel(Log.DEBUG)
}

// Get URLs from environment or use defaults
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak-foobar.apps.ostest.test.metalkube.org'
const CONSOLE_URL = import.meta.env.VITE_CONSOLE_URL || window.location.origin

export const oidcConfig = {
  authority: `${KEYCLOAK_URL}/realms/innabox`,
  client_id: 'cloudkit-console',
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
    issuer: `${KEYCLOAK_URL}/realms/innabox`,
    authorization_endpoint: `${KEYCLOAK_URL}/realms/innabox/protocol/openid-connect/auth`,
    token_endpoint: `${KEYCLOAK_URL}/realms/innabox/protocol/openid-connect/token`,
    userinfo_endpoint: `${KEYCLOAK_URL}/realms/innabox/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${KEYCLOAK_URL}/realms/innabox/protocol/openid-connect/logout`,
    jwks_uri: `${KEYCLOAK_URL}/realms/innabox/protocol/openid-connect/certs`,
  },
}

export const userManager = new UserManager(oidcConfig)

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
