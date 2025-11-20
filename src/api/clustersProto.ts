/**
 * Protobuf message serializers for fulfillment.v1.Clusters service
 * Based on proto definitions in fulfillment-api/proto/fulfillment/v1/
 */

import { ProtobufWriter, ProtobufReader } from './protobuf'
import {
  Cluster,
  ClusterSpec,
  ClusterStatus,
  ClusterState,
  ClusterCondition,
  ClusterNodeSet,
} from './types'

// ============================================
// List Clusters
// ============================================

// Encode ClustersListRequest
export function encodeClustersListRequest(req: {
  offset?: number
  limit?: number
  filter?: string
  order?: string
}): Uint8Array {
  const writer = new ProtobufWriter()
  if (req.offset !== undefined) writer.writeInt32(1, req.offset)
  if (req.limit !== undefined) writer.writeInt32(2, req.limit)
  if (req.filter) writer.writeString(3, req.filter)
  if (req.order) writer.writeString(4, req.order)
  return writer.toUint8Array()
}

// Decode ClustersListResponse
export function decodeClustersListResponse(data: Uint8Array): {
  size?: number
  total?: number
  items: Cluster[]
} {
  const reader = new ProtobufReader(data)
  const result: { size?: number; total?: number; items: Cluster[] } = { items: [] }

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 3: // size
        result.size = reader.readInt32()
        break
      case 4: // total
        result.total = reader.readInt32()
        break
      case 5: // items
        if (tag.wireType === 2) {
          const clusterBytes = reader.readBytes()
          result.items.push(decodeCluster(clusterBytes))
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return result
}

// ============================================
// Get Cluster
// ============================================

// Decode ClustersGetResponse
export function decodeClustersGetResponse(data: Uint8Array): Cluster {
  const reader = new ProtobufReader(data)
  let cluster: Cluster | null = null

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    if (tag.fieldNumber === 1 && tag.wireType === 2) {
      const clusterBytes = reader.readBytes()
      cluster = decodeCluster(clusterBytes)
    } else {
      reader.skipField(tag.wireType)
    }
  }

  if (!cluster) {
    throw new Error('Invalid ClustersGetResponse: no cluster found')
  }

  return cluster
}

// ============================================
// Create Cluster
// ============================================

// Encode ClustersCreateRequest
export function encodeClustersCreateRequest(cluster: Partial<Cluster>): Uint8Array {
  const writer = new ProtobufWriter()
  const clusterBytes = encodeCluster(cluster)
  writer.writeMessage(1, clusterBytes)
  return writer.toUint8Array()
}

// Decode ClustersCreateResponse (same structure as Get)
export function decodeClustersCreateResponse(data: Uint8Array): Cluster {
  return decodeClustersGetResponse(data)
}

// ============================================
// Cluster Encoding
// ============================================

// Encode Cluster
function encodeCluster(cluster: Partial<Cluster>): Uint8Array {
  const writer = new ProtobufWriter()

  if (cluster.id) writer.writeString(1, cluster.id)

  if (cluster.metadata) {
    const metadataBytes = encodeMetadata(cluster.metadata)
    writer.writeMessage(2, metadataBytes)
  }

  if (cluster.spec) {
    const specBytes = encodeClusterSpec(cluster.spec)
    writer.writeMessage(3, specBytes)
  }

  // status (field 4) - read-only, skip for create/update

  return writer.toUint8Array()
}

// Encode ClusterSpec
function encodeClusterSpec(spec: ClusterSpec): Uint8Array {
  const writer = new ProtobufWriter()

  if (spec.template) writer.writeString(1, spec.template)

  if (spec.template_parameters) {
    for (const [key, value] of Object.entries(spec.template_parameters)) {
      const mapEntryBytes = encodeTemplateParameterMapEntry(key, value)
      writer.writeMessage(2, mapEntryBytes)
    }
  }

  if (spec.node_sets) {
    for (const [key, value] of Object.entries(spec.node_sets)) {
      const mapEntryBytes = encodeNodeSetMapEntry(key, value)
      writer.writeMessage(3, mapEntryBytes)
    }
  }

  return writer.toUint8Array()
}

// Encode template parameter map entry
function encodeTemplateParameterMapEntry(key: string, value: any): Uint8Array {
  const writer = new ProtobufWriter()
  writer.writeString(1, key)

  // value is an Any type
  const anyBytes = encodeAny(value)
  writer.writeMessage(2, anyBytes)

  return writer.toUint8Array()
}

// Encode node set map entry
function encodeNodeSetMapEntry(key: string, value: ClusterNodeSet): Uint8Array {
  const writer = new ProtobufWriter()
  writer.writeString(1, key)

  const nodeSetBytes = encodeNodeSet(value)
  writer.writeMessage(2, nodeSetBytes)

  return writer.toUint8Array()
}

// Encode node set
function encodeNodeSet(nodeSet: ClusterNodeSet): Uint8Array {
  const writer = new ProtobufWriter()

  if (nodeSet.host_class) writer.writeString(1, nodeSet.host_class)
  if (nodeSet.size !== undefined) writer.writeInt32(2, nodeSet.size)

  return writer.toUint8Array()
}

// Encode google.protobuf.Any
function encodeAny(value: any): Uint8Array {
  const writer = new ProtobufWriter()

  writer.writeString(1, value['@type'])

  // Encode the wrapped value based on type
  const valueBytes = encodeAnyValue(value['@type'], value.value)
  writer.writeBytes(2, valueBytes)

  return writer.toUint8Array()
}

// Encode wrapped primitive values
function encodeAnyValue(typeUrl: string, value: any): Uint8Array {
  const writer = new ProtobufWriter()

  // Field 1 = value for all wrapper types
  if (typeUrl.includes('StringValue')) {
    writer.writeString(1, value)
  } else if (typeUrl.includes('Int32Value')) {
    writer.writeInt32(1, value)
  } else if (typeUrl.includes('BoolValue')) {
    writer.writeBool(1, value)
  }
  // Add more types as needed

  return writer.toUint8Array()
}

// Encode Metadata
function encodeMetadata(metadata: {
  name?: string
  creation_timestamp?: string
  creators?: string[]
}): Uint8Array {
  const writer = new ProtobufWriter()

  if (metadata.name) writer.writeString(2, metadata.name)
  // creation_timestamp and creators are read-only for creation

  return writer.toUint8Array()
}

// ============================================
// Cluster Decoding
// ============================================

// Decode Cluster
export function decodeCluster(data: Uint8Array): Cluster {
  const reader = new ProtobufReader(data)
  const cluster: Partial<Cluster> = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // id
        cluster.id = reader.readString()
        break
      case 2: // metadata
        if (tag.wireType === 2) {
          const metadataBytes = reader.readBytes()
          cluster.metadata = decodeMetadata(metadataBytes)
        }
        break
      case 3: // spec
        if (tag.wireType === 2) {
          const specBytes = reader.readBytes()
          cluster.spec = decodeClusterSpec(specBytes)
        }
        break
      case 4: // status
        if (tag.wireType === 2) {
          const statusBytes = reader.readBytes()
          cluster.status = decodeClusterStatus(statusBytes)
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return cluster as Cluster
}

// Decode ClusterSpec
function decodeClusterSpec(data: Uint8Array): ClusterSpec {
  const reader = new ProtobufReader(data)
  const spec: Partial<ClusterSpec> = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // template
        spec.template = reader.readString()
        break
      case 2: // template_parameters (map of Any)
        if (tag.wireType === 2) {
          if (!spec.template_parameters) spec.template_parameters = {}
          const mapEntryBytes = reader.readBytes()
          const mapEntry = decodeTemplateParameterMapEntry(mapEntryBytes)
          spec.template_parameters[mapEntry.key] = mapEntry.value
        }
        break
      case 3: // node_sets (map)
        if (tag.wireType === 2) {
          if (!spec.node_sets) spec.node_sets = {}
          const mapEntryBytes = reader.readBytes()
          const mapEntry = decodeNodeSetMapEntry(mapEntryBytes)
          spec.node_sets[mapEntry.key] = mapEntry.value
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return spec
}

// Decode ClusterStatus
function decodeClusterStatus(data: Uint8Array): ClusterStatus {
  const reader = new ProtobufReader(data)
  const status: Partial<ClusterStatus> = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // state (enum)
        status.state = mapClusterState(reader.readVarint())
        break
      case 2: // conditions
        if (tag.wireType === 2) {
          if (!status.conditions) status.conditions = []
          const conditionBytes = reader.readBytes()
          status.conditions.push(decodeClusterCondition(conditionBytes))
        }
        break
      case 3: // api_url
        status.api_url = reader.readString()
        break
      case 4: // console_url
        status.console_url = reader.readString()
        break
      case 5: // node_sets (map)
        if (tag.wireType === 2) {
          if (!status.node_sets) status.node_sets = {}
          const mapEntryBytes = reader.readBytes()
          const mapEntry = decodeNodeSetMapEntry(mapEntryBytes)
          status.node_sets[mapEntry.key] = mapEntry.value
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return status
}

// Map enum value to ClusterState
function mapClusterState(value: number): ClusterState {
  const states: ClusterState[] = [
    ClusterState.UNSPECIFIED,
    ClusterState.PROGRESSING,
    ClusterState.READY,
    ClusterState.FAILED,
  ]
  return states[value] || ClusterState.UNSPECIFIED
}

// Decode ClusterCondition
function decodeClusterCondition(data: Uint8Array): ClusterCondition {
  const reader = new ProtobufReader(data)
  const condition: Partial<ClusterCondition> = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // type (string)
        condition.type = reader.readString()
        break
      case 2: // status (string)
        condition.status = reader.readString()
        break
      case 3: // last_transition_time (Timestamp)
        if (tag.wireType === 2) {
          const timestampBytes = reader.readBytes()
          condition.last_transition_time = decodeTimestamp(timestampBytes)
        }
        break
      case 4: // reason (optional)
        condition.reason = reader.readString()
        break
      case 5: // message (optional)
        condition.message = reader.readString()
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return condition
}

// Decode template parameter map entry
function decodeTemplateParameterMapEntry(data: Uint8Array): { key: string; value: any } {
  const reader = new ProtobufReader(data)
  let key = ''
  let value: any = null

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // key
        key = reader.readString()
        break
      case 2: // value (Any)
        if (tag.wireType === 2) {
          const anyBytes = reader.readBytes()
          value = decodeAny(anyBytes)
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return { key, value }
}

// Decode node set map entry
function decodeNodeSetMapEntry(data: Uint8Array): { key: string; value: ClusterNodeSet } {
  const reader = new ProtobufReader(data)
  let key = ''
  let value: ClusterNodeSet = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // key
        key = reader.readString()
        break
      case 2: // value
        if (tag.wireType === 2) {
          const nodeSetBytes = reader.readBytes()
          value = decodeNodeSet(nodeSetBytes)
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return { key, value }
}

// Decode node set
function decodeNodeSet(data: Uint8Array): ClusterNodeSet {
  const reader = new ProtobufReader(data)
  const nodeSet: Partial<ClusterNodeSet> = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // host_class
        nodeSet.host_class = reader.readString()
        break
      case 2: // size
        nodeSet.size = reader.readInt32()
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return nodeSet
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
function decodeMetadata(data: Uint8Array): {
  name?: string
  creation_timestamp?: string
  creators?: string[]
} {
  const reader = new ProtobufReader(data)
  const metadata: { name?: string; creation_timestamp?: string; creators?: string[] } = {}

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
      case 2: // name
        metadata.name = reader.readString()
        break
      case 6: // creators (repeated string)
        if (tag.wireType === 2) {
          if (!metadata.creators) metadata.creators = []
          metadata.creators.push(reader.readString())
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return metadata
}

// Decode google.protobuf.Any
function decodeAny(data: Uint8Array): { '@type': string; value?: any } {
  const reader = new ProtobufReader(data)
  const any: { '@type': string; value?: any } = { '@type': '' }

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // type_url
        any['@type'] = reader.readString()
        break
      case 2: // value (bytes)
        if (tag.wireType === 2) {
          const valueBytes = reader.readBytes()
          // Decode based on type_url
          any.value = decodeAnyValue(any['@type'], valueBytes)
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return any
}

// Decode wrapped primitive values
function decodeAnyValue(typeUrl: string, data: Uint8Array): any {
  const reader = new ProtobufReader(data)

  // All wrapper types have field 1 = value
  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    if (tag.fieldNumber === 1) {
      if (typeUrl.includes('StringValue')) {
        return reader.readString()
      } else if (typeUrl.includes('Int32Value')) {
        return reader.readInt32()
      } else if (typeUrl.includes('BoolValue')) {
        return reader.readBool()
      }
      // Add more types as needed
    }

    reader.skipField(tag.wireType)
  }

  return undefined
}
