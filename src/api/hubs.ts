import { Hub, ListResponse } from './types'
import { getUserManager } from '../auth/oidcConfig'
import { getConfig } from './config'
import { logger } from '@/utils/logger'

// Helper to get API base URL from centralized config
const getApiBaseUrl = async (): Promise<string> => {
  const config = await getConfig()
  if (!config.fulfillmentApiUrl) {
    throw new Error('fulfillmentApiUrl not found in configuration')
  }
  return config.fulfillmentApiUrl
}

export const getHubs = async (): Promise<ListResponse<Hub>> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/hubs`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch hubs: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      items: data.items || [],
      total: data.total || 0,
      size: data.size || 0,
    }
  } catch (error) {
    logger.error('Failed to fetch hubs', error)
    throw error
  }
}

export const getHub = async (id: string): Promise<Hub> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/hubs/${id}`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch hub ${id}: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.object || data
  } catch (error) {
    logger.error(`Failed to fetch hub ${id}`, error)
    throw error
  }
}

export const createHub = async (hub: Partial<Hub>): Promise<Hub> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/hubs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ object: hub }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create hub: ${response.status} ${response.statusText}: ${errorText}`)
    }

    const data = await response.json()
    return data.object || data
  } catch (error) {
    logger.error('Failed to create hub', error)
    throw error
  }
}

export const updateHub = async (id: string, hub: Partial<Hub>): Promise<Hub> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/hubs/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ object: { ...hub, id } }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update hub ${id}: ${response.status} ${response.statusText}: ${errorText}`)
    }

    const data = await response.json()
    return data.object || data
  } catch (error) {
    logger.error(`Failed to update hub ${id}`, error)
    throw error
  }
}

export const deleteHub = async (id: string): Promise<void> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/hubs/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete hub ${id}: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    logger.error(`Failed to delete hub ${id}`, error)
    throw error
  }
}
