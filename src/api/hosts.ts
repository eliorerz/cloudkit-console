import { Host, ListResponse } from './types'
import { getUserManager } from '../auth/oidcConfig'
import { getConfig } from './config'
import { deduplicateRequest } from '../utils/requestDeduplication'
import { logger } from '@/utils/logger'

// Helper to get API base URL from centralized config
const getApiBaseUrl = async (): Promise<string> => {
  const config = await getConfig()
  if (!config.fulfillmentApiUrl) {
    throw new Error('fulfillmentApiUrl not found in configuration')
  }
  return config.fulfillmentApiUrl
}

export const getHosts = async (options?: {
  offset?: number
  limit?: number
  filter?: string
}): Promise<ListResponse<Host>> => {
  const key = `hosts-${JSON.stringify(options || {})}`
  return deduplicateRequest(key, async () => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    // Build query parameters
    const params = new URLSearchParams()
    if (options?.offset !== undefined) params.append('offset', options.offset.toString())
    if (options?.limit !== undefined) params.append('limit', options.limit.toString())
    if (options?.filter) params.append('filter', options.filter)

    const url = `${baseUrl}/api/private/v1/hosts${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch hosts: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      items: data.items || [],
      total: data.total || 0,
      size: data.size || 0,
    }
  } catch (error) {
    logger.error('Failed to fetch hosts', error)
    throw error
  }
  })
}

export const getHost = async (id: string): Promise<Host> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/hosts/${id}`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch host ${id}: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    logger.error(`Failed to fetch host ${id}`, error)
    throw error
  }
}

export const deleteHost = async (id: string): Promise<void> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/hosts/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete host ${id}: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    logger.error(`Failed to delete host ${id}`, error)
    throw error
  }
}

export const updateHost = async (host: Host): Promise<Host> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/hosts/${host.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(host),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update host ${host.id}: ${response.status} ${response.statusText}: ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    logger.error(`Failed to update host ${host.id}`, error)
    throw error
  }
}
