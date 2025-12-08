import axios, { AxiosInstance } from 'axios'
import { getConfig } from './config'
import { retryWithBackoff } from '../utils/retryWithBackoff'
import { logger } from '@/utils/logger'

// Get fulfillment API URL from centralized config
const getFulfillmentApiUrl = async (): Promise<string> => {
  const config = await getConfig()
  if (!config.fulfillmentApiUrl) {
    throw new Error('fulfillmentApiUrl not found in configuration')
  }
  return config.fulfillmentApiUrl
}

class APIClient {
  private client: AxiosInstance
  private baseURL: string = ''
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null

  constructor() {
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use(
      async (config) => {
        // Ensure client is initialized before making requests
        await this.ensureInitialized()

        const token = localStorage.getItem('osac_ui_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )
  }

  /**
   * Public method to pre-initialize the API client.
   * Call this once on app startup to avoid lazy initialization on first request.
   */
  async initialize(): Promise<void> {
    return this.ensureInitialized()
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Prevent multiple simultaneous initialization attempts
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        this.baseURL = await getFulfillmentApiUrl()
        this.client.defaults.baseURL = `${this.baseURL}/api/fulfillment/v1`
        this.initialized = true
        logger.info('API client initialized with baseURL', { baseURL: this.client.defaults.baseURL })
      } catch (error) {
        logger.error('Failed to initialize API client', error)
        // Reset state to allow retry on next request
        this.initPromise = null
        this.initialized = false
        throw error
      }
    })()

    return this.initPromise
  }

  async get<T>(endpoint: string): Promise<T> {
    logger.debug('API GET request', { endpoint })

    return retryWithBackoff(async () => {
      const response = await this.client.get<T>(endpoint, {
        validateStatus: (status) => status >= 200 && status < 300,
        headers: {
          'Accept': 'application/json',
        },
      })

      // Validate that we got JSON, not HTML
      const contentType = response.headers['content-type']
      if (contentType && !contentType.includes('application/json')) {
        logger.error('Expected JSON but received different content type', undefined, { contentType, endpoint })
        throw new Error(`API returned ${contentType} instead of JSON`)
      }

      logger.debug('API GET response', { endpoint, status: response.status })

      return response.data
    })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    logger.debug('API POST request', { endpoint })

    return retryWithBackoff(async () => {
      const response = await this.client.post<T>(endpoint, data)
      logger.debug('API POST response', { endpoint, status: response.status })
      return response.data
    }, { maxRetries: 2 }) // Fewer retries for mutations
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    logger.debug('API PUT request', { endpoint })

    return retryWithBackoff(async () => {
      const response = await this.client.put<T>(endpoint, data)
      logger.debug('API PUT response', { endpoint, status: response.status })
      return response.data
    }, { maxRetries: 2 })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    logger.debug('API PATCH request', { endpoint })

    return retryWithBackoff(async () => {
      const response = await this.client.patch<T>(endpoint, data)
      logger.debug('API PATCH response', { endpoint, status: response.status })
      return response.data
    }, { maxRetries: 2 })
  }

  async delete<T>(endpoint: string): Promise<T> {
    logger.debug('API DELETE request', { endpoint })

    return retryWithBackoff(async () => {
      const response = await this.client.delete<T>(endpoint)
      logger.debug('API DELETE response', { endpoint, status: response.status })
      return response.data
    }, { maxRetries: 2 })
  }
}

export const apiClient = new APIClient()
