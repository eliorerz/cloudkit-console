import { apiClient } from './client'
import { VirtualMachine, ListResponse } from './types'
import { deduplicateRequest } from '../utils/requestDeduplication'
import { logger } from '@/utils/logger'

export const getVirtualMachines = async (): Promise<ListResponse<VirtualMachine>> => {
  return deduplicateRequest('virtual-machines-list', async () => {
    try {
      const response = await apiClient.get<ListResponse<VirtualMachine>>('/virtual_machines')
      return response
    } catch (error) {
      logger.error('Failed to fetch virtual machines', error)
      throw error
    }
  })
}

export const getVirtualMachine = async (id: string): Promise<VirtualMachine> => {
  try {
    // The gRPC-Gateway response_body: "object" mapping returns the VM directly
    const response = await apiClient.get<VirtualMachine>(`/virtual_machines/${id}`)
    return response
  } catch (error) {
    logger.error(`Failed to fetch virtual machine ${id}`, error)
    throw error
  }
}

export const createVirtualMachine = async (vm: Partial<VirtualMachine>): Promise<VirtualMachine> => {
  try {
    // The gRPC-Gateway body: "object" mapping expects VM directly in request
    // and response_body: "object" returns VM directly in response
    const response = await apiClient.post<VirtualMachine>('/virtual_machines', vm)
    return response
  } catch (error) {
    logger.error('Failed to create virtual machine', error)
    throw error
  }
}

export const deleteVirtualMachine = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/virtual_machines/${id}`)
  } catch (error) {
    logger.error(`Failed to delete virtual machine ${id}`, error)
    throw error
  }
}

export const updateVirtualMachine = async (vm: VirtualMachine): Promise<VirtualMachine> => {
  try {
    // The gRPC-Gateway body: "object" and response_body: "object" mappings
    // mean both request and response use the object directly without wrapping
    const response = await apiClient.put<VirtualMachine>(`/virtual_machines/${vm.id}`, vm)
    return response
  } catch (error) {
    logger.error(`Failed to update virtual machine ${vm.id}`, error)
    throw error
  }
}
