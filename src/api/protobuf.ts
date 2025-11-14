/**
 * Minimal protobuf encoder/decoder for Hubs messages
 * Based on protobuf wire format specification
 */

export class ProtobufWriter {
  private buffer: number[] = []

  writeVarint(value: number): void {
    while (value >= 0x80) {
      this.buffer.push((value & 0x7f) | 0x80)
      value >>>= 7
    }
    this.buffer.push(value & 0x7f)
  }

  writeTag(fieldNumber: number, wireType: number): void {
    this.writeVarint((fieldNumber << 3) | wireType)
  }

  writeString(fieldNumber: number, value: string): void {
    if (!value) return
    const encoded = new TextEncoder().encode(value)
    this.writeTag(fieldNumber, 2) // Wire type 2 = length-delimited
    this.writeVarint(encoded.length)
    this.buffer.push(...encoded)
  }

  writeInt32(fieldNumber: number, value: number): void {
    if (value === undefined || value === null) return
    this.writeTag(fieldNumber, 0) // Wire type 0 = varint
    this.writeVarint(value)
  }

  writeBytes(fieldNumber: number, value: Uint8Array): void {
    if (!value || value.length === 0) return
    this.writeTag(fieldNumber, 2) // Wire type 2 = length-delimited
    this.writeVarint(value.length)
    this.buffer.push(...value)
  }

  writeMessage(fieldNumber: number, message: Uint8Array): void {
    if (!message || message.length === 0) return
    this.writeTag(fieldNumber, 2) // Wire type 2 = length-delimited
    this.writeVarint(message.length)
    this.buffer.push(...message)
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer)
  }
}

export class ProtobufReader {
  private pos = 0

  constructor(private buffer: Uint8Array) {}

  readVarint(): number {
    let value = 0
    let shift = 0
    while (this.pos < this.buffer.length) {
      const byte = this.buffer[this.pos++]
      value |= (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) break
      shift += 7
    }
    return value
  }

  readTag(): { fieldNumber: number; wireType: number } | null {
    if (this.pos >= this.buffer.length) return null
    const tag = this.readVarint()
    return {
      fieldNumber: tag >>> 3,
      wireType: tag & 0x7,
    }
  }

  readString(): string {
    const length = this.readVarint()
    const bytes = this.buffer.slice(this.pos, this.pos + length)
    this.pos += length
    return new TextDecoder().decode(bytes)
  }

  readBytes(): Uint8Array {
    const length = this.readVarint()
    const bytes = this.buffer.slice(this.pos, this.pos + length)
    this.pos += length
    return bytes
  }

  readInt32(): number {
    return this.readVarint()
  }

  skipField(wireType: number): void {
    switch (wireType) {
      case 0: // Varint
        this.readVarint()
        break
      case 1: // 64-bit
        this.pos += 8
        break
      case 2: // Length-delimited
        const length = this.readVarint()
        this.pos += length
        break
      case 5: // 32-bit
        this.pos += 4
        break
      default:
        throw new Error(`Unknown wire type: ${wireType}`)
    }
  }
}
