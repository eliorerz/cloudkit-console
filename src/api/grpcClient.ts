/**
 * gRPC-Web client for calling private API endpoints
 * Uses protobuf encoding with gRPC-Web protocol
 */

import { getUserManager } from '../auth/oidcConfig'

// Get fulfillment API URL from runtime config
const getFulfillmentApiUrl = async (): Promise<string> => {
  const response = await fetch('/api/config')
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`)
  }
  const config = await response.json()
  if (!config.fulfillmentApiUrl) {
    throw new Error('fulfillmentApiUrl not found in configuration')
  }
  return config.fulfillmentApiUrl
}

export class GrpcWebClient {
  private baseURL: string | null = null
  private initPromise: Promise<void> | null = null

  constructor() {}

  private async ensureInitialized(): Promise<void> {
    if (this.baseURL) {
      return
    }

    // Prevent multiple simultaneous initialization attempts
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        this.baseURL = await getFulfillmentApiUrl()
        console.log('gRPC client initialized with baseURL:', this.baseURL)
      } catch (error) {
        console.error('Failed to initialize gRPC client:', error)
        throw error
      }
    })()

    return this.initPromise
  }

  async call<TResponse>(
    service: string,
    method: string,
    requestBytes: Uint8Array,
    responseDecoder: (data: Uint8Array) => TResponse
  ): Promise<TResponse> {
    // Ensure client is initialized before making requests
    await this.ensureInitialized()

    const url = `${this.baseURL}/${service}/${method}`

    // Get the authorization token
    const userManager = getUserManager()
    const user = await userManager.getUser()
    if (!user?.access_token) {
      throw new Error('Not authenticated')
    }

    // Encode the request in gRPC-Web format
    const grpcWebRequest = this.encodeGrpcWebRequest(requestBytes)

    // Make the gRPC-Web request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/grpc-web+proto',
        'X-Grpc-Web': '1',
        'X-User-Agent': 'grpc-web-javascript/0.1',
        'Authorization': `Bearer ${user.access_token}`,
      },
      body: grpcWebRequest as BodyInit,
    })

    // Check for gRPC errors in headers
    const grpcStatus = response.headers.get('grpc-status')
    const grpcMessage = response.headers.get('grpc-message')

    if (grpcStatus && grpcStatus !== '0') {
      const message = grpcMessage ? decodeURIComponent(grpcMessage) : `gRPC error (code ${grpcStatus})`
      throw new Error(message)
    }

    if (!response.ok && !grpcStatus) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
    }

    // Decode the gRPC-Web response
    const responseBytes = await this.decodeGrpcWebResponse(response)
    return responseDecoder(responseBytes)
  }

  private encodeGrpcWebRequest(messageBytes: Uint8Array): Uint8Array {
    // gRPC-Web wire format:
    // [1 byte flags][4 bytes length BE][N bytes protobuf message]
    const length = messageBytes.length
    const buffer = new Uint8Array(5 + length)

    buffer[0] = 0 // Uncompressed flag
    buffer[1] = (length >> 24) & 0xff
    buffer[2] = (length >> 16) & 0xff
    buffer[3] = (length >> 8) & 0xff
    buffer[4] = length & 0xff
    buffer.set(messageBytes, 5)

    return buffer
  }

  private async decodeGrpcWebResponse(response: Response): Promise<Uint8Array> {
    const arrayBuffer = await response.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    if (bytes.length < 5) {
      throw new Error('Invalid gRPC-Web response: too short')
    }

    // Read the message frame
    const flags = bytes[0]
    const length =
      (bytes[1] << 24) | (bytes[2] << 16) | (bytes[3] << 8) | bytes[4]

    if (flags & 0x80) {
      // This is a trailer frame, not a message frame
      // Trailers come after the message and contain status
      throw new Error('Received trailer frame instead of message')
    }

    if (bytes.length < 5 + length) {
      throw new Error('Invalid gRPC-Web response: incomplete message')
    }

    // Extract the protobuf message bytes
    const messageBytes = bytes.slice(5, 5 + length)

    // Check for trailers after the message
    if (bytes.length > 5 + length) {
      const trailerPos = 5 + length
      if (bytes[trailerPos] & 0x80) {
        // Has trailers, check for errors
        // Trailers are in the format: flag(1) + length(4) + data
        const trailerLength =
          (bytes[trailerPos + 1] << 24) |
          (bytes[trailerPos + 2] << 16) |
          (bytes[trailerPos + 3] << 8) |
          bytes[trailerPos + 4]
        const trailerBytes = bytes.slice(
          trailerPos + 5,
          trailerPos + 5 + trailerLength
        )
        const trailerText = new TextDecoder().decode(trailerBytes)

        // Parse trailer for grpc-status
        const statusMatch = trailerText.match(/grpc-status:\s*(\d+)/)
        if (statusMatch && statusMatch[1] !== '0') {
          const messageMatch = trailerText.match(/grpc-message:\s*([^\r\n]+)/)
          const message = messageMatch
            ? decodeURIComponent(messageMatch[1])
            : `gRPC error (code ${statusMatch[1]})`
          throw new Error(message)
        }
      }
    }

    return messageBytes
  }
}

export const grpcClient = new GrpcWebClient()
