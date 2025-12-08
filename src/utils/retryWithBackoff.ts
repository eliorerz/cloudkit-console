/**
 * Retry utility with exponential backoff
 * Retries failed API requests with increasing delays
 */

import { logger } from '@/utils/logger'

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  shouldRetry: (error: unknown) => {
    // Retry on network errors and 5xx server errors
    if (error instanceof Error && error.name === 'AbortError') return false
    if (typeof error === 'object' && error !== null) {
      const err = error as { response?: { status?: number }; message?: string }
      if (err.response?.status && err.response.status >= 500) return true
      if (err.message?.includes('fetch')) return true
      if (err.message?.includes('network')) return true
    }
    return false
  },
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if we shouldn't or if we're out of retries
      if (!opts.shouldRetry(error) || attempt === opts.maxRetries) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      )

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * delay * 0.3 // ±30% jitter
      const finalDelay = delay + jitter

      logger.info(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${Math.round(finalDelay)}ms`)

      await new Promise(resolve => setTimeout(resolve, finalDelay))
    }
  }

  throw lastError
}
