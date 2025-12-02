/**
 * Protocol buffer encoding/decoding for private Hosts API
 * Package: private.v1
 */

import { Reader, Writer } from 'protobufjs/minimal'

// ============================================
// Request/Response Types
// ============================================

export interface PrivateHostsListRequest {
  offset?: number
  limit?: number
  filter?: string
}

export interface PrivateHostsListResponse {
  size?: number
  total?: number
  items: PrivateHost[]
}

export interface PrivateHostsGetRequest {
  id: string
}

export interface PrivateHostsGetResponse {
  object: PrivateHost
}

// ============================================
// Private Host Types
// ============================================

export interface PrivateHost {
  id: string
  metadata?: PrivateMetadata
  spec?: PrivateHostSpec
  status?: PrivateHostStatus
}

export interface PrivateMetadata {
  name?: string
  creation_timestamp?: string
  tenants?: string[]
  creators?: string[]
  version?: string
}

export interface PrivateHostSpec {
  power_state?: string
}

export interface PrivateHostStatus {
  state?: string
  power_state?: string
  conditions?: PrivateHostCondition[]
  host_pool?: string
  cluster?: string
}

export interface PrivateHostCondition {
  type?: string
  status?: string
  last_transition_time?: string
  reason?: string
  message?: string
}

// ============================================
// Encoders
// ============================================

export const encodePrivateHostsListRequest = (
  request: PrivateHostsListRequest
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

export const encodePrivateHostsGetRequest = (
  request: PrivateHostsGetRequest
): Uint8Array => {
  const writer = new Writer()
  writer.uint32(10).string(request.id)
  return writer.finish()
}

// ============================================
// Decoders
// ============================================

export const decodePrivateHostsListResponse = (
  bytes: Uint8Array
): PrivateHostsListResponse => {
  const reader = new Reader(bytes)
  const response: PrivateHostsListResponse = { items: [] }

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
        response.items.push(decodePrivateHost(reader))
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return response
}

export const decodePrivateHostsGetResponse = (
  bytes: Uint8Array
): PrivateHostsGetResponse => {
  const reader = new Reader(bytes)
  let object: PrivateHost | undefined

  while (reader.pos < reader.len) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        object = decodePrivateHost(reader)
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

const decodePrivateHost = (reader: Reader): PrivateHost => {
  const length = reader.uint32()
  const end = reader.pos + length
  const host: PrivateHost = { id: '' }

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        host.id = reader.string()
        break
      case 2:
        host.metadata = decodePrivateMetadata(reader)
        break
      case 3:
        host.spec = decodePrivateHostSpec(reader)
        break
      case 4:
        host.status = decodePrivateHostStatus(reader)
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return host
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

const decodePrivateHostSpec = (reader: Reader): PrivateHostSpec => {
  const length = reader.uint32()
  const end = reader.pos + length
  const spec: PrivateHostSpec = {}

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        spec.power_state = decodeHostPowerState(reader.int32())
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return spec
}

const decodePrivateHostStatus = (reader: Reader): PrivateHostStatus => {
  const length = reader.uint32()
  const end = reader.pos + length
  const status: PrivateHostStatus = {}

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        status.state = decodeHostState(reader.int32())
        break
      case 2:
        status.power_state = decodeHostPowerState(reader.int32())
        break
      case 3:
        if (!status.conditions) status.conditions = []
        status.conditions.push(decodePrivateHostCondition(reader))
        break
      case 4:
        status.host_pool = reader.string()
        break
      case 5:
        status.cluster = reader.string()
        break
      default:
        reader.skipType(tag & 7)
    }
  }

  return status
}

const decodePrivateHostCondition = (reader: Reader): PrivateHostCondition => {
  const length = reader.uint32()
  const end = reader.pos + length
  const condition: PrivateHostCondition = {}

  while (reader.pos < end) {
    const tag = reader.uint32()
    switch (tag >>> 3) {
      case 1:
        condition.type = decodeHostConditionType(reader.int32())
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

// ============================================
// Helper Functions
// ============================================

const decodeHostState = (value: number): string => {
  switch (value) {
    case 0: return 'UNSPECIFIED'
    case 1: return 'PROGRESSING'
    case 2: return 'READY'
    case 3: return 'FAILED'
    default: return `UNKNOWN_${value}`
  }
}

const decodeHostPowerState = (value: number): string => {
  switch (value) {
    case 0: return 'UNSPECIFIED'
    case 1: return 'ON'
    case 2: return 'OFF'
    default: return `UNKNOWN_${value}`
  }
}

const decodeHostConditionType = (value: number): string => {
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
