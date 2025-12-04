import axios, { AxiosInstance } from 'axios'

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

        const token = localStorage.getItem('cloudkit_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )
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
        console.log('API client initialized with baseURL:', this.client.defaults.baseURL)
      } catch (error) {
        console.error('Failed to initialize API client:', error)
        // Reset state to allow retry on next request
        this.initPromise = null
        this.initialized = false
        throw error
      }
    })()

    return this.initPromise
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.client.get<T>(endpoint, {
      validateStatus: (status) => status >= 200 && status < 300,
      headers: {
        'Accept': 'application/json',
      },
    })

    // Validate that we got JSON, not HTML
    const contentType = response.headers['content-type']
    if (contentType && !contentType.includes('application/json')) {
      console.error(`Expected JSON but received ${contentType}`)
      throw new Error(`API returned ${contentType} instead of JSON`)
    }

    return response.data
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.post<T>(endpoint, data)
    return response.data
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.put<T>(endpoint, data)
    return response.data
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<T>(endpoint, data)
    return response.data
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.client.delete<T>(endpoint)
    return response.data
  }
}

export const apiClient = new APIClient()
