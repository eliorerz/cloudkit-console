import { apiClient } from './client'
import { Hub, ListResponse } from './types'

export const getHubs = async (): Promise<ListResponse<Hub>> => {
  try {
    const response = await apiClient.get<ListResponse<Hub>>('/hubs')
    return response
  } catch (error) {
    console.error('Failed to fetch hubs:', error)
    throw error
  }
}

export const getHub = async (id: string): Promise<Hub> => {
  try {
    const response = await apiClient.get<{ object: Hub }>(`/hubs/${id}`)
    return response.object
  } catch (error) {
    console.error(`Failed to fetch hub ${id}:`, error)
    throw error
  }
}

export const createHub = async (hub: Partial<Hub>): Promise<Hub> => {
  try {
    const response = await apiClient.post<{ object: Hub }>('/hubs', hub)
    return response.object
  } catch (error) {
    console.error('Failed to create hub:', error)
    throw error
  }
}

export const updateHub = async (id: string, hub: Partial<Hub>): Promise<Hub> => {
  try {
    const response = await apiClient.put<{ object: Hub }>(`/hubs/${id}`, hub)
    return response.object
  } catch (error) {
    console.error(`Failed to update hub ${id}:`, error)
    throw error
  }
}

export const deleteHub = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/hubs/${id}`)
  } catch (error) {
    console.error(`Failed to delete hub ${id}:`, error)
    throw error
  }
}
