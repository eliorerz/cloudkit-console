import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { deduplicateRequest, clearPendingRequests } from './requestDeduplication'

describe('requestDeduplication', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearPendingRequests()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearPendingRequests()
  })

  it('should execute request only once for concurrent calls with same key', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data')

    const promise1 = deduplicateRequest('key1', fetchFn)
    const promise2 = deduplicateRequest('key1', fetchFn)
    const promise3 = deduplicateRequest('key1', fetchFn)

    const results = await Promise.all([promise1, promise2, promise3])

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(results).toEqual(['data', 'data', 'data'])
  })

  it('should execute requests separately for different keys', async () => {
    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    const fetchFn2 = vi.fn().mockResolvedValue('data2')

    const promise1 = deduplicateRequest('key1', fetchFn1)
    const promise2 = deduplicateRequest('key2', fetchFn2)

    const results = await Promise.all([promise1, promise2])

    expect(fetchFn1).toHaveBeenCalledTimes(1)
    expect(fetchFn2).toHaveBeenCalledTimes(1)
    expect(results).toEqual(['data1', 'data2'])
  })

  it('should execute new request after cache expires', async () => {
    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    const fetchFn2 = vi.fn().mockResolvedValue('data2')

    const result1 = await deduplicateRequest('key1', fetchFn1)

    // Advance time past cache duration (1000ms + cleanup delay)
    vi.advanceTimersByTime(2100)

    const result2 = await deduplicateRequest('key1', fetchFn2)

    expect(fetchFn1).toHaveBeenCalledTimes(1)
    expect(fetchFn2).toHaveBeenCalledTimes(1)
    expect(result1).toBe('data1')
    expect(result2).toBe('data2')
  })

  it('should propagate errors to all waiting promises', async () => {
    const error = new Error('Request failed')
    const fetchFn = vi.fn().mockRejectedValue(error)

    const promise1 = deduplicateRequest('key1', fetchFn)
    const promise2 = deduplicateRequest('key1', fetchFn)
    const promise3 = deduplicateRequest('key1', fetchFn)

    await expect(promise1).rejects.toThrow('Request failed')
    await expect(promise2).rejects.toThrow('Request failed')
    await expect(promise3).rejects.toThrow('Request failed')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('should allow retry after failed request', async () => {
    const fetchFn1 = vi.fn().mockRejectedValue(new Error('Failed'))
    const fetchFn2 = vi.fn().mockResolvedValue('success')

    await expect(deduplicateRequest('key1', fetchFn1)).rejects.toThrow('Failed')

    // Advance time past cache cleanup
    vi.advanceTimersByTime(2100)

    const result = await deduplicateRequest('key1', fetchFn2)

    expect(fetchFn1).toHaveBeenCalledTimes(1)
    expect(fetchFn2).toHaveBeenCalledTimes(1)
    expect(result).toBe('success')
  })

  it('should clean up pending request after completion', async () => {
    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    const fetchFn2 = vi.fn().mockResolvedValue('data2')

    await deduplicateRequest('key1', fetchFn1)

    // Advance time past cache duration
    vi.advanceTimersByTime(2100)

    // This should execute fetchFn2 since the previous request is cleaned up
    await deduplicateRequest('key1', fetchFn2)

    expect(fetchFn1).toHaveBeenCalledTimes(1)
    expect(fetchFn2).toHaveBeenCalledTimes(1)
  })

  it('should handle different return types', async () => {
    interface User {
      id: number
      name: string
    }

    const fetchFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test User' })

    const result = await deduplicateRequest<User>('user1', fetchFn)

    expect(result).toEqual({ id: 1, name: 'Test User' })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('should handle async delays correctly', async () => {
    let resolvePromise: (value: string) => void
    const delayedPromise = new Promise<string>((resolve) => {
      resolvePromise = resolve
    })
    const fetchFn = vi.fn().mockReturnValue(delayedPromise)

    const promise1 = deduplicateRequest('key1', fetchFn)
    const promise2 = deduplicateRequest('key1', fetchFn)

    expect(fetchFn).toHaveBeenCalledTimes(1)

    // Resolve the promise
    resolvePromise!('delayed data')

    const results = await Promise.all([promise1, promise2])
    expect(results).toEqual(['delayed data', 'delayed data'])
  })

  it('should clear all pending requests', async () => {
    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    const fetchFn2 = vi.fn().mockResolvedValue('data2')

    // Start a request but don't wait for it
    deduplicateRequest('key1', fetchFn1)

    // Clear all pending requests
    clearPendingRequests()

    // This should execute a new request since cache was cleared
    await deduplicateRequest('key1', fetchFn2)

    expect(fetchFn1).toHaveBeenCalledTimes(1)
    expect(fetchFn2).toHaveBeenCalledTimes(1)
  })

  it('should respect cache duration within 1 second', async () => {
    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    const fetchFn2 = vi.fn().mockResolvedValue('data2')

    await deduplicateRequest('key1', fetchFn1)

    // Advance time less than cache duration
    vi.advanceTimersByTime(500)

    // Should still use cached promise
    const result = await deduplicateRequest('key1', fetchFn2)

    expect(fetchFn1).toHaveBeenCalledTimes(1)
    expect(fetchFn2).not.toHaveBeenCalled()
    expect(result).toBe('data1')
  })
})
