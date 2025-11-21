/**
 * API functions for Cluster as a Service (CaaS)
 * Provides high-level functions for cluster templates and clusters
 */

import { grpcClient } from './grpcClient'
import { Cluster, ClusterTemplate, ListResponse } from './types'
import {
  encodeClusterTemplatesListRequest,
  decodeClusterTemplatesListResponse,
} from './clusterTemplatesProto'
import { getUserManager } from '../auth/oidcConfig'

// ============================================
// Cluster Templates
// ============================================

export const listClusterTemplates = async (options?: {
  offset?: number
  limit?: number
  filter?: string
  order?: string
}): Promise<ListResponse<ClusterTemplate>> => {
  try {
    const requestBytes = encodeClusterTemplatesListRequest(options || {})
    const response = await grpcClient.call(
      'fulfillment.v1.ClusterTemplates',
      'List',
      requestBytes,
      decodeClusterTemplatesListResponse
    )
    return {
      items: response.items || [],
      total: response.total || 0,
      size: response.size || 0,
    }
  } catch (error) {
    console.error('Failed to list cluster templates:', error)
    throw error
  }
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

    const url = `${baseUrl}/api/fulfillment/v1/clusters${params.toString() ? '?' + params.toString() : ''}`
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
    console.error('Failed to list clusters:', error)
    throw error
  }
}

export const getCluster = async (id: string): Promise<Cluster> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/fulfillment/v1/clusters/${id}`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get cluster ${id}: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to get cluster ${id}:`, error)
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

    const response = await fetch(`${baseUrl}/api/fulfillment/v1/clusters`, {
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
    console.error('Failed to create cluster:', error)
    throw error
  }
}

// ============================================
// Cluster Credentials (HTTP endpoints)
// ============================================

// Helper to get API base URL
const getApiBaseUrl = async (): Promise<string> => {
  const response = await fetch('/api/config')
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`)
  }
  const config = await response.json()
  if (!config.fulfillmentApiUrl) {
    throw new Error('fulfillmentApiUrl not found in configuration')
  }
  return config.fulfillmentApiUrl
}

export const getClusterKubeconfig = async (id: string): Promise<string> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/fulfillment/v1/clusters/${id}/kubeconfig`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch kubeconfig: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error(`Failed to get kubeconfig for cluster ${id}:`, error)
    throw error
  }
}

export const getClusterPassword = async (id: string): Promise<string> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${baseUrl}/api/fulfillment/v1/clusters/${id}/password`, {
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch password: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error(`Failed to get password for cluster ${id}:`, error)
    throw error
  }
}
