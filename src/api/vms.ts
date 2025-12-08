import { apiClient } from './client'
import { VirtualMachine, ListResponse } from './types'
import { deduplicateRequest } from '../utils/requestDeduplication'
import { logger } from '@/utils/logger'

export const getVirtualMachines = async (): Promise<ListResponse<VirtualMachine>> => {
  return deduplicateRequest('virtual-machines-list', async () => {
    try {
      logger.debug('Fetching virtual machines list')
      const response = await apiClient.get<ListResponse<VirtualMachine>>('/virtual_machines')
      logger.info('Virtual machines fetched successfully', { count: response.items?.length || 0 })
      return response
    } catch (error) {
      logger.error('Failed to fetch virtual machines', error)
      throw error
    }
  })
}

export const getVirtualMachine = async (id: string): Promise<VirtualMachine> => {
  try {
    logger.debug('Fetching virtual machine details', { vmId: id })
    // The gRPC-Gateway response_body: "object" mapping returns the VM directly
    const response = await apiClient.get<VirtualMachine>(`/virtual_machines/${id}`)
    logger.info('Virtual machine fetched successfully', { vmId: id, name: response.metadata?.name })
    return response
  } catch (error) {
    logger.error(`Failed to fetch virtual machine ${id}`, error, { vmId: id })
    throw error
  }
}

export const createVirtualMachine = async (vm: Partial<VirtualMachine>): Promise<VirtualMachine> => {
  try {
    logger.info('Creating virtual machine', { name: vm.metadata?.name })
    // The gRPC-Gateway body: "object" mapping expects VM directly in request
    // and response_body: "object" returns VM directly in response
    const response = await apiClient.post<VirtualMachine>('/virtual_machines', vm)
    logger.info('Virtual machine created successfully', { vmId: response.id, name: response.metadata?.name })
    return response
  } catch (error) {
    logger.error('Failed to create virtual machine', error, { name: vm.metadata?.name })
    throw error
  }
}

export const deleteVirtualMachine = async (id: string): Promise<void> => {
  try {
    logger.info('Deleting virtual machine', { vmId: id })
    await apiClient.delete(`/virtual_machines/${id}`)
    logger.info('Virtual machine deleted successfully', { vmId: id })
  } catch (error) {
    logger.error(`Failed to delete virtual machine ${id}`, error, { vmId: id })
    throw error
  }
}

export const updateVirtualMachine = async (vm: VirtualMachine): Promise<VirtualMachine> => {
  try {
    logger.info('Updating virtual machine', { vmId: vm.id, name: vm.metadata?.name })
    // The gRPC-Gateway body: "object" and response_body: "object" mappings
    // mean both request and response use the object directly without wrapping
    const response = await apiClient.put<VirtualMachine>(`/virtual_machines/${vm.id}`, vm)
    logger.info('Virtual machine updated successfully', { vmId: vm.id, name: response.metadata?.name })
    return response
  } catch (error) {
    logger.error(`Failed to update virtual machine ${vm.id}`, error, { vmId: vm.id })
    throw error
  }
}
