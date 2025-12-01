/**
 * Protobuf message serializers for fulfillment.v1.ClusterTemplates service
 * Based on proto definitions in fulfillment-api/proto/fulfillment/v1/
 */

import { ProtobufWriter, ProtobufReader } from './protobuf'
import {
  ClusterTemplate,
  ClusterTemplateParameterDefinition,
  ClusterTemplateNodeSet,
} from './types'

// Encode ClusterTemplatesListRequest
export function encodeClusterTemplatesListRequest(req: {
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

// Decode ClusterTemplatesListResponse
export function decodeClusterTemplatesListResponse(data: Uint8Array): {
  size?: number
  total?: number
  items: ClusterTemplate[]
} {
  const reader = new ProtobufReader(data)
  const result: { size?: number; total?: number; items: ClusterTemplate[] } = { items: [] }

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
          const templateBytes = reader.readBytes()
          result.items.push(decodeClusterTemplate(templateBytes))
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return result
}

// Decode ClusterTemplate
function decodeClusterTemplate(data: Uint8Array): ClusterTemplate {
  const reader = new ProtobufReader(data)
  const template: Partial<ClusterTemplate> = {}

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // id
        template.id = reader.readString()
        break
      case 2: // metadata
        if (tag.wireType === 2) {
          const metadataBytes = reader.readBytes()
          template.metadata = decodeMetadata(metadataBytes)
        }
        break
      case 3: // title
        template.title = reader.readString()
        break
      case 4: // description
        template.description = reader.readString()
        break
      case 5: // parameters
        if (tag.wireType === 2) {
          if (!template.parameters) template.parameters = []
          const paramBytes = reader.readBytes()
          template.parameters.push(decodeParameterDefinition(paramBytes))
        }
        break
      case 6: // node_sets (map)
        if (tag.wireType === 2) {
          if (!template.node_sets) template.node_sets = {}
          const mapEntryBytes = reader.readBytes()
          const mapEntry = decodeNodeSetMapEntry(mapEntryBytes)
          template.node_sets[mapEntry.key] = mapEntry.value
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return template as ClusterTemplate
}

// Decode parameter definition
function decodeParameterDefinition(data: Uint8Array): ClusterTemplateParameterDefinition {
  const reader = new ProtobufReader(data)
  const param: Partial<ClusterTemplateParameterDefinition> = { name: '' }

  while (true) {
    const tag = reader.readTag()
    if (!tag) break

    switch (tag.fieldNumber) {
      case 1: // name
        param.name = reader.readString()
        break
      case 2: // title
        param.title = reader.readString()
        break
      case 3: // description
        param.description = reader.readString()
        break
      case 4: // required
        param.required = reader.readBool()
        break
      case 5: // type
        param.type = reader.readString()
        break
      case 6: // default (Any type)
        if (tag.wireType === 2) {
          const anyBytes = reader.readBytes()
          param.default = decodeAny(anyBytes)
        }
        break
      default:
        reader.skipField(tag.wireType)
    }
  }

  return param as ClusterTemplateParameterDefinition
}

// Decode node set map entry
function decodeNodeSetMapEntry(data: Uint8Array): {
  key: string
  value: ClusterTemplateNodeSet
} {
  const reader = new ProtobufReader(data)
  let key = ''
  let value: ClusterTemplateNodeSet = {}

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
function decodeNodeSet(data: Uint8Array): ClusterTemplateNodeSet {
  const reader = new ProtobufReader(data)
  const nodeSet: Partial<ClusterTemplateNodeSet> = {}

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

// Decode Metadata message with creators support
function decodeMetadata(data: Uint8Array): {
  creation_timestamp?: string
  creators?: string[]
} {
  const reader = new ProtobufReader(data)
  const metadata: { creation_timestamp?: string; creators?: string[] } = {}

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

// Decode wrapped primitive values (StringValue, Int32Value, BoolValue, etc.)
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
      // Add more types as needed (Int64Value, DoubleValue, etc.)
    }

    reader.skipField(tag.wireType)
  }

  return undefined
}
