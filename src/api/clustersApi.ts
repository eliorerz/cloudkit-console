/**
 * API functions for Cluster as a Service (CaaS)
 * Provides high-level functions for cluster templates and clusters
 */

import { Cluster, ClusterTemplate, ListResponse } from './types'
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

// ============================================
// Cluster Templates
// ============================================

export const listClusterTemplates = async (options?: {
  offset?: number
  limit?: number
  filter?: string
  order?: string
}): Promise<ListResponse<ClusterTemplate>> => {
  const key = `cluster-templates-${JSON.stringify(options || {})}`
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
    if (options?.order) params.append('order', options.order)

    const url = `${baseUrl}/api/fulfillment/v1/cluster_templates${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to list cluster templates: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      items: data.items || [],
      total: data.total || 0,
      size: data.size || 0,
    }
  } catch (error) {
    logger.error('Failed to list cluster templates', error)
    throw error
  }
  })
}

// ============================================
// Clusters
// ============================================

export const listClusters = async (options?: {
  offset?: number
  limit?: number
  filter?: string
  order?: string
}): Promise<ListResponse<Cluster>> => {
  const key = `clusters-${JSON.stringify(options || {})}`
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
    if (options?.order) params.append('order', options.order)

    const url = `${baseUrl}/api/private/v1/clusters${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to list clusters: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      items: data.items || [],
      total: data.total || 0,
      size: data.size || 0,
    }
  } catch (error) {
    logger.error('Failed to list clusters', error)
    throw error
  }
  })
}

export const getCluster = async (id: string): Promise<Cluster> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/clusters/${id}`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get cluster ${id}: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    logger.error(`Failed to get cluster ${id}`, error)
    throw error
  }
}

export const createCluster = async (cluster: Partial<Cluster>): Promise<Cluster> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/clusters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cluster),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create cluster: ${response.status} ${response.statusText}: ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    logger.error('Failed to create cluster', error)
    throw error
  }
}

// ============================================
// Cluster Credentials
// ============================================

export const getClusterKubeconfig = async (id: string): Promise<string> => {
  try {
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const baseUrl = await getApiBaseUrl()

    const response = await fetch(`${baseUrl}/api/fulfillment/v1/clusters/${id}/kubeconfig`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch kubeconfig: ${response.status} ${response.statusText}`)
    }

    // API returns JSON with base64-encoded data
    const jsonResponse = await response.json()

    // Decode base64 data
    if (jsonResponse.data) {
      return atob(jsonResponse.data)
    }

    throw new Error('Invalid kubeconfig response format')
  } catch (error) {
    logger.error(`Failed to get kubeconfig for cluster ${id}`, error)
    throw error
  }
}

export const getClusterPassword = async (id: string): Promise<string> => {
  try {
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const baseUrl = await getApiBaseUrl()

    const response = await fetch(`${baseUrl}/api/fulfillment/v1/clusters/${id}/password`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch password: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const encodedPassword = data.data || await response.text()

    // Decode base64 password
    try {
      return atob(encodedPassword)
    } catch (e) {
      // If decode fails, return as is
      return encodedPassword
    }
  } catch (error) {
    logger.error(`Failed to get password for cluster ${id}`, error)
    throw error
  }
}

// ============================================
// Cluster Scaling
// ============================================

export const scaleCluster = async (
  id: string,
  nodeSetName: string,
  newSize: number,
  hostClass: string
): Promise<Cluster> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/clusters/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spec: {
          node_sets: {
            [nodeSetName]: {
              host_class: hostClass,
              size: newSize,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to scale cluster: ${response.status} ${response.statusText}: ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    logger.error(`Failed to scale cluster ${id}`, error)
    throw error
  }
}

// ============================================
// Delete Cluster
// ============================================

export const deleteCluster = async (id: string): Promise<void> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/private/v1/clusters/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to delete cluster: ${response.status} ${response.statusText}: ${errorText}`)
    }
  } catch (error) {
    logger.error(`Failed to delete cluster ${id}`, error)
    throw error
  }
}
