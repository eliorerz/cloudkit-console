/**
 * Request deduplication utility
 * Prevents duplicate concurrent API calls by caching in-flight promises
 */

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

const pendingRequests = new Map<string, PendingRequest<unknown>>()
const CACHE_DURATION = 1000 // Cache for 1 second to prevent rapid duplicate calls

/**
 * Deduplicate API requests by key
 * If a request with the same key is already in-flight, return the existing promise
 * Otherwise, execute the request and cache the promise
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const now = Date.now()

  // Check if there's a pending request for this key
  const pending = pendingRequests.get(key) as PendingRequest<T> | undefined
  if (pending && (now - pending.timestamp) < CACHE_DURATION) {
    // Return the existing promise
    return pending.promise as Promise<T>
  }

  // Create new request
  const promise = requestFn()
    .finally(() => {
      // Remove from cache after completion
      setTimeout(() => {
        const current = pendingRequests.get(key)
        if (current?.promise === promise) {
          pendingRequests.delete(key)
        }
      }, CACHE_DURATION)
    })

  // Cache the promise
  pendingRequests.set(key, { promise, timestamp: now })

  return promise
}

/**
 * Clear all pending requests (useful for testing or cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear()
}
