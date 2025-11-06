import { apiClient } from './client'
import { VirtualMachine, ListResponse } from './types'

export const getVirtualMachines = async (): Promise<ListResponse<VirtualMachine>> => {
  try {
    const response = await apiClient.get<ListResponse<VirtualMachine>>('/vms')
    return response
  } catch (error) {
    console.error('Failed to fetch virtual machines:', error)
    throw error
  }
}

export const getVirtualMachine = async (id: string): Promise<VirtualMachine> => {
  try {
    const response = await apiClient.get<{ object: VirtualMachine }>(`/vms/${id}`)
    return response.object
  } catch (error) {
    console.error(`Failed to fetch virtual machine ${id}:`, error)
    throw error
  }
}

export const createVirtualMachine = async (vm: Partial<VirtualMachine>): Promise<VirtualMachine> => {
  try {
    const response = await apiClient.post<{ object: VirtualMachine }>('/vms', vm)
    return response.object
  } catch (error) {
    console.error('Failed to create virtual machine:', error)
    throw error
  }
}

export const deleteVirtualMachine = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/vms/${id}`)
  } catch (error) {
    console.error(`Failed to delete virtual machine ${id}:`, error)
    throw error
  }
}

export const updateVirtualMachine = async (vm: VirtualMachine): Promise<VirtualMachine> => {
  try {
    const response = await apiClient.put<{ object: VirtualMachine }>(`/vms/${vm.id}`, vm)
    return response.object
  } catch (error) {
    console.error(`Failed to update virtual machine ${vm.id}:`, error)
    throw error
  }
}
