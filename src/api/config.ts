export interface AppConfig {
  keycloakUrl: string
  keycloakRealm: string
  oidcClientId: string
  fulfillmentApiUrl: string
  namespace: string
  genericTemplateId: string
}

let cachedConfig: AppConfig | null = null

export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  const response = await fetch('/api/config')
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`)
  }

  cachedConfig = await response.json()
  return cachedConfig!
}

export async function getGenericTemplateId(): Promise<string> {
  const config = await getConfig()
  return config.genericTemplateId
}
