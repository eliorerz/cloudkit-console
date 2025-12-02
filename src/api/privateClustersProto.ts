/**
 * Protocol buffer encoding/decoding for private Clusters API
 * Package: private.v1
 */

import { Reader, Writer } from 'protobufjs/minimal'

// ============================================
// Request/Response Types
// ============================================

export interface PrivateClustersListRequest {
  offset?: number
  limit?: number
  filter?: string
}

export interface PrivateClustersListResponse {
  size?: number
  total?: number
  items: PrivateCluster[]
}

export interface PrivateClustersGetRequest {
  id: string
}

export interface PrivateClustersGetResponse {
  object: PrivateCluster
}

// ============================================
// Private Cluster Types
// ============================================

export interface PrivateCluster {
  id: string
  metadata?: PrivateMetadata
  spec?: PrivateClusterSpec
  status?: PrivateClusterStatus
}

export interface PrivateMetadata {
  name?: string
  creation_timestamp?: string
  tenants?: string[]
  creators?: string[]
  version?: string
}

export interface PrivateClusterSpec {
  template?: string
  template_parameters?: Record<string, any>
  node_sets?: Record<string, PrivateClusterNodeSet>
}

export interface PrivateClusterStatus {
  state?: string
  conditions?: PrivateClusterCondition[]
  api_url?: string
  console_url?: string
  node_sets?: Record<string, PrivateClusterNodeSet>
  hub?: string
}

export interface PrivateClusterCondition {
  type?: string
  status?: string
  last_transition_time?: string
  reason?: string
  message?: string
}

export interface PrivateClusterNodeSet {
  host_class?: string
  size?: number
}

// ============================================
// Encoders
// ============================================

export const encodePrivateClustersListRequest = (
  request: PrivateClustersListRequest
): Uint8Array => {
  const writer = new Writer()

  if (request.offset !== undefined) {
    writer.uint32(8).int32(request.offset)
  }
  if (request.limit !== undefined) {
    writer.uint32(16).int32(request.limit)
  }
  if (request.filter !== undefined) {
    writer.uint32(26).string(request.filter)
  }

  return writer.finish()
}

export const encodePrivateClustersGetRequest = (
  request: PrivateClustersGetRequest
): Uint8Array => {
  const writer = new Writer()
  writer.uint32(10).string(request.id)
  return writer.finish()
}

// ============================================
// Decoders
// ============================================

export const decodePrivateClustersListResponse = (
  bytes: Uint8Array
): PrivateClustersListResponse => {
  const reader = new Reader(bytes)
  const response: PrivateClustersListResponse = { items: [] }

  while (reader.pos < reader.len) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        response.size = reader.int32()
        break
      case 2:
        response.total = reader.int32()
        break
      case 3:
        response.items.push(decodePrivateCluster(reader))
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return response
}

export const decodePrivateClustersGetResponse = (
  bytes: Uint8Array
): PrivateClustersGetResponse => {
  const reader = new Reader(bytes)
  let object: PrivateCluster | undefined

  while (reader.pos < reader.len) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        object = decodePrivateCluster(reader)
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  if (!object) {
    throw new Error('Missing object in response')
  }

  return { object }
}

const decodePrivateCluster = (reader: Reader): PrivateCluster => {
  const length = reader.uint32()
  const end = reader.pos + length
  const cluster: PrivateCluster = { id: '' }

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        cluster.id = reader.string()
        break
      case 2:
        cluster.metadata = decodePrivateMetadata(reader)
        break
      case 3:
        cluster.spec = decodePrivateClusterSpec(reader)
        break
      case 4:
        cluster.status = decodePrivateClusterStatus(reader)
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return cluster
}

const decodePrivateMetadata = (reader: Reader): PrivateMetadata => {
  const length = reader.uint32()
  const end = reader.pos + length
  const metadata: PrivateMetadata = {}

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        metadata.name = reader.string()
        break
      case 2:
        metadata.creation_timestamp = reader.string()
        break
      case 3:
        if (!metadata.tenants) metadata.tenants = []
        metadata.tenants.push(reader.string())
        break
      case 4:
        if (!metadata.creators) metadata.creators = []
        metadata.creators.push(reader.string())
        break
      case 5:
        metadata.version = reader.string()
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return metadata
}

const decodePrivateClusterSpec = (reader: Reader): PrivateClusterSpec => {
  const length = reader.uint32()
  const end = reader.pos + length
  const spec: PrivateClusterSpec = {}

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        spec.template = reader.string()
        break
      case 3:
        if (!spec.node_sets) spec.node_sets = {}
        const nodeSetEntry = decodeMapEntry(reader, () => decodePrivateClusterNodeSet(reader))
        spec.node_sets[nodeSetEntry.key] = nodeSetEntry.value
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return spec
}

const decodePrivateClusterStatus = (reader: Reader): PrivateClusterStatus => {
  const length = reader.uint32()
  const end = reader.pos + length
  const status: PrivateClusterStatus = {}

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        status.state = decodeClusterState(reader.int32())
        break
      case 2:
        if (!status.conditions) status.conditions = []
        status.conditions.push(decodePrivateClusterCondition(reader))
        break
      case 3:
        status.api_url = reader.string()
        break
      case 4:
        status.console_url = reader.string()
        break
      case 5:
        if (!status.node_sets) status.node_sets = {}
        const nodeSetEntry = decodeMapEntry(reader, () => decodePrivateClusterNodeSet(reader))
        status.node_sets[nodeSetEntry.key] = nodeSetEntry.value
        break
      case 6:
        status.hub = reader.string()
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return status
}

const decodePrivateClusterCondition = (reader: Reader): PrivateClusterCondition => {
  const length = reader.uint32()
  const end = reader.pos + length
  const condition: PrivateClusterCondition = {}

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        condition.type = decodeClusterConditionType(reader.int32())
        break
      case 2:
        condition.status = decodeConditionStatus(reader.int32())
        break
      case 3:
        const tsLength = reader.uint32()
        const tsEnd = reader.pos + tsLength
        while (reader.pos < tsEnd) {
          const tsTag = reader.uint32()
          if (tsTag >>> 3 === 1) {
            condition.last_transition_time = new Date(Number(reader.int64()) * 1000).toISOString()
          } else {
            reader.skipType(tsTag & 7)
          }
        }
        break
      case 4:
        condition.reason = reader.string()
        break
      case 5:
        condition.message = reader.string()
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return condition
}

const decodePrivateClusterNodeSet = (reader: Reader): PrivateClusterNodeSet => {
  const length = reader.uint32()
  const end = reader.pos + length
  const nodeSet: PrivateClusterNodeSet = {}

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        nodeSet.host_class = reader.string()
        break
      case 2:
        nodeSet.size = reader.int32()
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return nodeSet
}

// ============================================
// Helper Functions
// ============================================

const decodeMapEntry = <T>(reader: Reader, decodeValue: () => T): { key: string; value: T } => {
  const length = reader.uint32()
  const end = reader.pos + length
  let key = ''
  let value: T | undefined

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        key = reader.string()
        break
      case 2:
        value = decodeValue()
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  if (!value) {
    throw new Error('Missing value in map entry')
  }

  return { key, value }
}

const decodeClusterState = (value: number): string => {
  switch (value) {
    case 0: return 'UNSPECIFIED'
    case 1: return 'PROGRESSING'
    case 2: return 'READY'
    case 3: return 'FAILED'
    default: return `UNKNOWN_${value}`
  }
}

const decodeClusterConditionType = (value: number): string => {
  switch (value) {
    case 0: return 'UNSPECIFIED'
    case 1: return 'PROGRESSING'
    case 2: return 'READY'
    case 3: return 'FAILED'
    case 4: return 'DEGRADED'
    default: return `UNKNOWN_${value}`
  }
}

const decodeConditionStatus = (value: number): string => {
  switch (value) {
    case 0: return 'UNSPECIFIED'
    case 1: return 'TRUE'
    case 2: return 'FALSE'
    case 3: return 'UNKNOWN'
    default: return `UNKNOWN_${value}`
  }
}
