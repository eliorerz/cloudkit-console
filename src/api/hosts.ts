import { apiClient } from './client'
import { Host, ListResponse } from './types'

export const getHosts = async (options?: {
  offset?: number
  limit?: number
  filter?: string
}): Promise<ListResponse<Host>> => {
  try {
    // Build query parameters
    const params = new URLSearchParams()
    if (options?.offset !== undefined) params.append('offset', options.offset.toString())
    if (options?.limit !== undefined) params.append('limit', options.limit.toString())
    if (options?.filter) params.append('filter', options.filter)

    const endpoint = `/hosts${params.toString() ? '?' + params.toString() : ''}`
    const response = await apiClient.get<ListResponse<Host>>(endpoint)

    return {
      items: response.items || [],
      total: response.total || 0,
      size: response.size || 0,
    }
  } catch (error) {
    console.error('Failed to fetch hosts:', error)
    throw error
  }
}

export const getHost = async (id: string): Promise<Host> => {
  try {
    const response = await apiClient.get<Host>(`/hosts/${id}`)
    return response
  } catch (error) {
    console.error(`Failed to fetch host ${id}:`, error)
    throw error
  }
}

export const deleteHost = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/hosts/${id}`)
  } catch (error) {
    console.error(`Failed to delete host ${id}:`, error)
    throw error
  }
}

export const updateHost = async (host: Host): Promise<Host> => {
  try {
    const response = await apiClient.put<Host>(`/hosts/${host.id}`, host)
    return response
  } catch (error) {
    console.error(`Failed to update host ${host.id}:`, error)
    throw error
  }
}
