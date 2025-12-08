import { apiClient } from './client'
import { Template, ListResponse } from './types'
import { deduplicateRequest } from '../utils/requestDeduplication'
import { logger } from '@/utils/logger'

export const getTemplates = async (): Promise<ListResponse<Template>> => {
  return deduplicateRequest('templates-list', async () => {
    try {
      const response = await apiClient.get<ListResponse<Template>>('/virtual_machine_templates')
      return response
    } catch (error) {
      logger.error('Failed to fetch templates', error)
      throw error
    }
  })
}

export const getTemplate = async (id: string): Promise<Template> => {
  try {
    const response = await apiClient.get<Template>(`/virtual_machine_templates/${id}`)
    return response
  } catch (error) {
    logger.error(`Failed to fetch template ${id}`, error)
    throw error
  }
}

export const createTemplate = async (template: Partial<Template>): Promise<Template> => {
  try {
    // The gRPC-Gateway body: "object" mapping expects Template directly in request
    // and response_body: "object" returns Template directly in response
    const response = await apiClient.post<Template>('/virtual_machine_templates', template)
    return response
  } catch (error) {
    logger.error('Failed to create template', error)
    throw error
  }
}

export const updateTemplate = async (id: string, template: Partial<Template>): Promise<Template> => {
  try {
    // Use PATCH instead of PUT - the API expects { object: template } format
    const response = await apiClient.patch<Template>(`/virtual_machine_templates/${id}`, { object: template })
    return response
  } catch (error) {
    logger.error(`Failed to update template ${id}`, error)
    throw error
  }
}

export const deleteTemplate = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/virtual_machine_templates/${id}`)
  } catch (error) {
    logger.error(`Failed to delete template ${id}`, error)
    throw error
  }
}
