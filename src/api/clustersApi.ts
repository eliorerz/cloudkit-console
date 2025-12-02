/**
 * API functions for Cluster as a Service (CaaS)
 * Provides high-level functions for cluster templates and clusters
 */

import { apiClient } from './client'
import { Cluster, ClusterTemplate, ListResponse } from './types'
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
    // Build query parameters
    const params = new URLSearchParams()
    if (options?.offset !== undefined) params.append('offset', options.offset.toString())
    if (options?.limit !== undefined) params.append('limit', options.limit.toString())
    if (options?.filter) params.append('filter', options.filter)
    if (options?.order) params.append('order', options.order)

    const endpoint = `/cluster_templates${params.toString() ? '?' + params.toString() : ''}`
    const response = await apiClient.get<ListResponse<ClusterTemplate>>(endpoint)

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
    // Build query parameters
    const params = new URLSearchParams()
    if (options?.offset !== undefined) params.append('offset', options.offset.toString())
    if (options?.limit !== undefined) params.append('limit', options.limit.toString())
    if (options?.filter) params.append('filter', options.filter)
    if (options?.order) params.append('order', options.order)

    const endpoint = `/clusters${params.toString() ? '?' + params.toString() : ''}`
    const response = await apiClient.get<ListResponse<Cluster>>(endpoint)

    return {
      items: response.items || [],
      total: response.total || 0,
      size: response.size || 0,
    }
  } catch (error) {
    console.error('Failed to list clusters:', error)
    throw error
  }
}

export const getCluster = async (id: string): Promise<Cluster> => {
  try {
    const response = await apiClient.get<Cluster>(`/clusters/${id}`)
    return response
  } catch (error) {
    console.error(`Failed to get cluster ${id}:`, error)
    throw error
  }
}

export const createCluster = async (cluster: Partial<Cluster>): Promise<Cluster> => {
  try {
    const response = await apiClient.post<Cluster>('/clusters', cluster)
    return response
  } catch (error) {
    console.error('Failed to create cluster:', error)
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

    // Get API base URL from config
    const configResp = await fetch('/api/config')
    if (!configResp.ok) {
      throw new Error(`Failed to fetch config: ${configResp.status} ${configResp.statusText}`)
    }
    const config = await configResp.json()
    const baseUrl = config.fulfillmentApiUrl

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
    const userManager = getUserManager()
    const user = await userManager.getUser()

    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    // Get API base URL from config
    const configResp = await fetch('/api/config')
    if (!configResp.ok) {
      throw new Error(`Failed to fetch config: ${configResp.status} ${configResp.statusText}`)
    }
    const config = await configResp.json()
    const baseUrl = config.fulfillmentApiUrl

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
    console.error(`Failed to get password for cluster ${id}:`, error)
    throw error
  }
}
