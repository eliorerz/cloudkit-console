import { getConfig } from './config'

export interface CPUSpec {
  type: string
  cores: number
  sockets: number
  threadsPerCore: number
}

export interface RAMSpec {
  size: string
  type: string
}

export interface DiskSpec {
  type: string
  size: string
  interface: string
}

export interface GPUSpec {
  model?: string
  count?: number
  memory?: string
}

export interface HostClass {
  name: string
  description: string
  category: string
  cpu: CPUSpec
  ram: RAMSpec
  disk: DiskSpec
  gpu: GPUSpec | null
}

export interface HostClassesResponse {
  [key: string]: HostClass
}

export async function getHostClasses(): Promise<HostClassesResponse> {
  const response = await fetch('/api/host-classes')
  if (!response.ok) {
    throw new Error('Failed to fetch host classes')
  }
  return response.json()
}

// Helper to get API base URL from centralized config
const getApiBaseUrl = async (): Promise<string> => {
  const config = await getConfig()
  if (!config.fulfillmentApiUrl) {
    throw new Error('fulfillmentApiUrl not found in configuration')
  }
  return config.fulfillmentApiUrl
}

export interface FulfillmentHostClass {
  id: string
  metadata?: {
    name?: string
    creation_timestamp?: string
    creators?: string[]
    tenants?: string[]
  }
  title?: string
  description?: string
}

export async function getHostClassById(id: string): Promise<FulfillmentHostClass> {
  const { getUserManager } = await import('../auth/oidcConfig')
  const baseUrl = await getApiBaseUrl()
  const userManager = getUserManager()
  const user = await userManager.getUser()

  if (!user?.access_token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${baseUrl}/api/private/v1/host_classes/${id}`, {
    headers: {
      'Authorization': `Bearer ${user.access_token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch host class ${id}: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
