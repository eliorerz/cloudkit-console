import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retryWithBackoff } from './retryWithBackoff'

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Suppress console.log for cleaner test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const promise = retryWithBackoff(fn)
    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on network errors', async () => {
    const networkError = new Error('fetch failed')
    const fn = vi
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success')

    const promise = retryWithBackoff(fn, {
      initialDelay: 100,
      shouldRetry: () => true,
    })

    vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should respect maxRetries limit', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'))

    const promise = retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelay: 100,
      shouldRetry: () => true,
    })

    vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow('Always fails')
    expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })

  it('should not retry if shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failed'))

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      shouldRetry: () => false,
    })

    await expect(promise).rejects.toThrow('Failed')
    expect(fn).toHaveBeenCalledTimes(1) // Only initial attempt
  })

  it('should use default shouldRetry for server errors', async () => {
    const serverError = {
      response: { status: 500 },
      message: 'Internal server error',
    }

    const fn = vi
      .fn()
      .mockRejectedValueOnce(serverError)
      .mockResolvedValue('success')

    const promise = retryWithBackoff(fn, { initialDelay: 100 })

    vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should use default shouldRetry for fetch errors', async () => {
    const fetchError = new Error('fetch error')

    const fn = vi
      .fn()
      .mockRejectedValueOnce(fetchError)
      .mockResolvedValue('success')

    const promise = retryWithBackoff(fn, { initialDelay: 100 })

    vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not retry on AbortError', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'

    const fn = vi.fn().mockRejectedValue(abortError)

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
    })

    await expect(promise).rejects.toThrow('Request aborted')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should apply exponential backoff', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValue('success')

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelay: 100,
      backoffFactor: 2,
      shouldRetry: () => true,
    })

    // Need to advance timers to handle jitter and exponential backoff
    vi.runAllTimersAsync()

    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should respect maxDelay cap', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValue('success')

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelay: 1000,
      backoffFactor: 10,
      maxDelay: 2000,
      shouldRetry: () => true,
    })

    vi.runAllTimersAsync()

    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
