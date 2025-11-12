import { apiClient } from './client'
import { Hub, ListResponse } from './types'

export const getHubs = async (): Promise<ListResponse<Hub>> => {
  try {
    const response = await apiClient.get<ListResponse<Hub>>('/host_pools')
    return response
  } catch (error) {
    console.error('Failed to fetch hubs:', error)
    throw error
  }
}

export const getHub = async (id: string): Promise<Hub> => {
  try {
    const response = await apiClient.get<{ object: Hub }>(`/host_pools/${id}`)
    return response.object
  } catch (error) {
    console.error(`Failed to fetch hub ${id}:`, error)
    throw error
  }
}

export const createHub = async (hub: Partial<Hub>): Promise<Hub> => {
  try {
    const response = await apiClient.post<{ object: Hub }>('/host_pools', hub)
    return response.object
  } catch (error) {
    console.error('Failed to create hub:', error)
    throw error
  }
}

export const updateHub = async (id: string, hub: Partial<Hub>): Promise<Hub> => {
  try {
    const response = await apiClient.put<{ object: Hub }>(`/host_pools/${id}`, hub)
    return response.object
  } catch (error) {
    console.error(`Failed to update hub ${id}:`, error)
    throw error
  }
}

export const deleteHub = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/host_pools/${id}`)
  } catch (error) {
    console.error(`Failed to delete hub ${id}:`, error)
    throw error
  }
}
