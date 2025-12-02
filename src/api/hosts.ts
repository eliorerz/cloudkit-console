import { apiClient } from './client'
import { grpcClient } from './grpcClient'
import { Host, ListResponse } from './types'
import {
  encodePrivateHostsListRequest,
  decodePrivateHostsListResponse,
  encodePrivateHostsGetRequest,
  decodePrivateHostsGetResponse,
  PrivateHost,
} from './privateHostsProto'
import { getUserManager } from '../auth/oidcConfig'

// ============================================
// Helper Functions
// ============================================

const convertPrivateHostToPublic = (privateHost: PrivateHost): Host => {
  return {
    id: privateHost.id,
    metadata: privateHost.metadata ? {
      name: privateHost.metadata.name,
      creation_timestamp: privateHost.metadata.creation_timestamp,
      tenants: privateHost.metadata.tenants,
      creators: privateHost.metadata.creators,
    } : undefined,
    spec: privateHost.spec ? {
      power_state: privateHost.spec.power_state,
    } : undefined,
    status: privateHost.status ? {
      state: privateHost.status.state,
      power_state: privateHost.status.power_state,
      conditions: privateHost.status.conditions,
      host_pool: privateHost.status.host_pool,
      cluster: privateHost.status.cluster,
    } : undefined,
  }
}

const isAdmin = async (): Promise<boolean> => {
  const userManager = getUserManager()
  const user = await userManager.getUser()
  const roles = user?.profile?.roles as string[] | undefined
  return roles?.includes('fulfillment-admin') || false
}

// ============================================
// Hosts API
// ============================================

export const getHosts = async (options?: {
  offset?: number
  limit?: number
  filter?: string
  usePrivateApi?: boolean
}): Promise<ListResponse<Host>> => {
  try {
    const admin = await isAdmin()
    const usePrivate = options?.usePrivateApi !== false && admin

    if (usePrivate) {
      // Use private gRPC API for admins
      const requestBytes = encodePrivateHostsListRequest({
        offset: options?.offset,
        limit: options?.limit,
        filter: options?.filter,
      })
      const response = await grpcClient.call(
        'private.v1.Hosts',
        'List',
        requestBytes,
        decodePrivateHostsListResponse
      )
      return {
        items: response.items.map(convertPrivateHostToPublic),
        total: response.total || 0,
        size: response.size || 0,
      }
    } else {
      // Use public HTTP API for non-admins
      const response = await apiClient.get<ListResponse<Host>>('/hosts')
      return response
    }
  } catch (error) {
    console.error('Failed to fetch hosts:', error)
    throw error
  }
}

export const getHost = async (id: string, usePrivateApi?: boolean): Promise<Host> => {
  try {
    const admin = await isAdmin()
    const usePrivate = usePrivateApi !== false && admin

    if (usePrivate) {
      // Use private gRPC API for admins
      const requestBytes = encodePrivateHostsGetRequest({ id })
      const response = await grpcClient.call(
        'private.v1.Hosts',
        'Get',
        requestBytes,
        decodePrivateHostsGetResponse
      )
      return convertPrivateHostToPublic(response.object)
    } else {
      // Use public HTTP API for non-admins
      const response = await apiClient.get<Host>(`/hosts/${id}`)
      return response
    }
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
