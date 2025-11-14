import { grpcClient } from './grpcClient'
import { Hub, ListResponse } from './types'
import {
  encodeHubsListRequest,
  decodeHubsListResponse,
  encodeHubsGetRequest,
  decodeHubsGetResponse,
  encodeHubsCreateRequest,
  decodeHubsCreateResponse,
  encodeHubsUpdateRequest,
  decodeHubsUpdateResponse,
  encodeHubsDeleteRequest,
  decodeHubsDeleteResponse,
} from './hubsProto'

// API functions using gRPC-Web client to call private.v1.Hubs service
export const getHubs = async (): Promise<ListResponse<Hub>> => {
  try {
    const requestBytes = encodeHubsListRequest({})
    const response = await grpcClient.call(
      'private.v1.Hubs',
      'List',
      requestBytes,
      decodeHubsListResponse
    )
    return {
      items: response.items || [],
      total: response.total || 0,
      size: response.size || 0,
    }
  } catch (error) {
    console.error('Failed to fetch hubs:', error)
    throw error
  }
}

export const getHub = async (id: string): Promise<Hub> => {
  try {
    const requestBytes = encodeHubsGetRequest({ id })
    const response = await grpcClient.call(
      'private.v1.Hubs',
      'Get',
      requestBytes,
      decodeHubsGetResponse
    )
    return response.object
  } catch (error) {
    console.error(`Failed to fetch hub ${id}:`, error)
    throw error
  }
}

export const createHub = async (hub: Partial<Hub>): Promise<Hub> => {
  try {
    const requestBytes = encodeHubsCreateRequest({ object: hub as Hub })
    const response = await grpcClient.call(
      'private.v1.Hubs',
      'Create',
      requestBytes,
      decodeHubsCreateResponse
    )
    return response.object
  } catch (error) {
    console.error('Failed to create hub:', error)
    throw error
  }
}

export const updateHub = async (id: string, hub: Partial<Hub>): Promise<Hub> => {
  try {
    const requestBytes = encodeHubsUpdateRequest({
      object: { ...hub, id } as Hub,
      update_mask: {
        paths: Object.keys(hub),
      },
    })
    const response = await grpcClient.call(
      'private.v1.Hubs',
      'Update',
      requestBytes,
      decodeHubsUpdateResponse
    )
    return response.object
  } catch (error) {
    console.error(`Failed to update hub ${id}:`, error)
    throw error
  }
}

export const deleteHub = async (id: string): Promise<void> => {
  try {
    const requestBytes = encodeHubsDeleteRequest({ id })
    await grpcClient.call(
      'private.v1.Hubs',
      'Delete',
      requestBytes,
      decodeHubsDeleteResponse
    )
  } catch (error) {
    console.error(`Failed to delete hub ${id}:`, error)
    throw error
  }
}
