/**
 * API functions for Tenants
 * Provides high-level functions for tenant management
 */

import axios from 'axios'
import { Tenant, ListResponse } from './types'
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

export const listTenants = async (options?: {
  offset?: number
  limit?: number
  filter?: string
  order?: string
}): Promise<ListResponse<Tenant>> => {
  try {
    const baseUrl = await getApiBaseUrl()
    const token = localStorage.getItem('osac_ui_token')

    // Build query parameters
    const params = new URLSearchParams()
    if (options?.offset !== undefined) params.append('offset', options.offset.toString())
    if (options?.limit !== undefined) params.append('limit', options.limit.toString())
    if (options?.filter) params.append('filter', options.filter)
    if (options?.order) params.append('order', options.order)

    const endpoint = `${baseUrl}/api/private/v1/tenants${params.toString() ? '?' + params.toString() : ''}`

    const response = await axios.get<ListResponse<Tenant>>(endpoint, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    })

    return {
      items: response.data.items || [],
      total: response.data.total || 0,
      size: response.data.size || 0,
    }
  } catch (error) {
    logger.error('Failed to list tenants', error)
    throw error
  }
}
