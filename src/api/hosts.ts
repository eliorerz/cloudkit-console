import { apiClient } from './client'
import { Host, ListResponse } from './types'

export const getHosts = async (): Promise<ListResponse<Host>> => {
  try {
    const response = await apiClient.get<ListResponse<Host>>('/hosts')
    return response
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
