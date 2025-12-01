/**
 * Protobuf message serializers for private.v1.Hubs service
 * Based on proto definitions in fulfillment-service/proto/private/v1/
 */

import { ProtobufWriter, ProtobufReader } from './protobuf'
import { Hub } from './types'

// Encode HubsListRequest
export function encodeHubsListRequest(req: {
  offset?: number
  limit?: number
  filter?: string
}): Uint8Array {
  const writer = new ProtobufWriter()
  if (req.offset !== undefined) writer.writeInt32(1, req.offset)
  if (req.limit !== undefined) writer.writeInt32(2, req.limit)
  if (req.filter) writer.writeString(3, req.filter)
  return writer.toUint8Array()
}

// Decode HubsListResponse
export function decodeHubsListResponse(data: Uint8Array): {
  size?: number
  total?: number
  items: Hub[]
} {
  const reader = new ProtobufReader(data)
  const result: { size?: number; total?: number; items: Hub[] } = { items: [] }

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // size
        result.size = reader.readInt32()
        break
      case 2: // total
        result.total = reader.readInt32()
        break
      case 3: // items
        if (tag.wireType === 2) {
          const hubBytes = reader.readBytes()
          result.items.push(decodeHub(hubBytes))
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return result
}

// Encode Hub message
export function encodeHub(hub: Hub): Uint8Array {
  const writer = new ProtobufWriter()

  if (hub.id) writer.writeString(1, hub.id)

  // metadata (field 2) - complex, skip for now

  if (hub.kubeconfig) {
    // kubeconfig is bytes field (field 3)
    // If it's base64-encoded string, decode it first
    const kubeconfigBytes = hub.kubeconfig.startsWith('apiVersion:')
      ? new TextEncoder().encode(hub.kubeconfig)
      : base64ToBytes(hub.kubeconfig)
    writer.writeBytes(3, kubeconfigBytes)
  }

  if (hub.namespace) writer.writeString(4, hub.namespace)

  return writer.toUint8Array()
}

// Decode Hub message
export function decodeHub(data: Uint8Array): Hub {
  const reader = new ProtobufReader(data)
  const hub: Partial<Hub> = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // id
        hub.id = reader.readString()
        break
      case 2: // metadata
        if (tag.wireType === 2) {
          const metadataBytes = reader.readBytes()
          hub.metadata = decodeMetadata(metadataBytes)
        }
        break
      case 3: // kubeconfig (bytes)
        if (tag.wireType === 2) {
          const kubeconfigBytes = reader.readBytes()
          // Store as base64 string for consistency
          hub.kubeconfig = bytesToBase64(kubeconfigBytes)
        }
        break
      case 4: // namespace
        hub.namespace = reader.readString()
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return hub as Hub
}

// Decode protobuf Timestamp message to ISO 8601 string
function decodeTimestamp(data: Uint8Array): string {
  const reader = new ProtobufReader(data)
  let seconds = 0
  let nanos = 0

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // seconds (int64 encoded as varint)
        seconds = reader.readVarint()
        break
      case 2: // nanos (int32)
        nanos = reader.readInt32()
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  // Convert to ISO 8601 string
  const date = new Date(seconds * 1000 + nanos / 1000000)
  return date.toISOString()
}

// Decode Metadata message
function decodeMetadata(data: Uint8Array): { creation_timestamp?: string } {
  const reader = new ProtobufReader(data)
  const metadata: { creation_timestamp?: string } = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // creation_timestamp
        if (tag.wireType === 2) {
          const timestampBytes = reader.readBytes()
          metadata.creation_timestamp = decodeTimestamp(timestampBytes)
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return metadata
}

// Encode HubsGetRequest
export function encodeHubsGetRequest(req: { id: string }): Uint8Array {
  const writer = new ProtobufWriter()
  writer.writeString(1, req.id)
  return writer.toUint8Array()
}

// Decode HubsGetResponse
export function decodeHubsGetResponse(data: Uint8Array): { object: Hub } {
  const reader = new ProtobufReader(data)
  let hub: Hub | undefined

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    if (tag.fieldNumber === 1 && tag.wireType === 2) {
      const hubBytes = reader.readBytes()
      hub = decodeHub(hubBytes)
    } else {
      reader.skipField(tag.wireType)
    }
  }

  return { object: hub! }
}

// Encode HubsCreateRequest
export function encodeHubsCreateRequest(req: { object: Hub }): Uint8Array {
  const writer = new ProtobufWriter()
  const hubBytes = encodeHub(req.object)
  writer.writeMessage(1, hubBytes)
  return writer.toUint8Array()
}

// Decode HubsCreateResponse
export function decodeHubsCreateResponse(data: Uint8Array): { object: Hub } {
  return decodeHubsGetResponse(data) // Same structure
}

// Encode HubsUpdateRequest
export function encodeHubsUpdateRequest(req: {
  object: Hub
  update_mask?: { paths: string[] }
}): Uint8Array {
  const writer = new ProtobufWriter()
  const hubBytes = encodeHub(req.object)
  writer.writeMessage(1, hubBytes)

  // TODO: Encode update_mask if needed (field 2)

  return writer.toUint8Array()
}

// Decode HubsUpdateResponse
export function decodeHubsUpdateResponse(data: Uint8Array): { object: Hub } {
  return decodeHubsGetResponse(data) // Same structure
}

// Encode HubsDeleteRequest
export function encodeHubsDeleteRequest(req: { id: string }): Uint8Array {
  const writer = new ProtobufWriter()
  writer.writeString(1, req.id)
  return writer.toUint8Array()
}

// Decode HubsDeleteResponse (empty message)
export function decodeHubsDeleteResponse(_data: Uint8Array): {} {
  return {}
}

// Utility functions
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  const binaryString = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('')
  return btoa(binaryString)
}
