import { apiClient } from './client'
import { Template, ListResponse } from './types'

export const getTemplates = async (): Promise<ListResponse<Template>> => {
  try {
    const response = await apiClient.get<ListResponse<Template>>('/templates')
    return response
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    throw error
  }
}
