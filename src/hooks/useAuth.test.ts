import { describe, it, expect } from 'vitest'
import { useAuth } from './useAuth'

// Simple test to verify the hook exists and can be imported
describe('useAuth', () => {
  it('should be a function', () => {
    expect(typeof useAuth).toBe('function')
  })

  it('should use useContext internally', () => {
    // Verify that the hook implementation calls useContext
    // This tests that the hook is structured correctly
    const hookString = useAuth.toString()
    expect(hookString).toContain('useContext')
  })
})
