import { describe, it, expect } from 'vitest'
import { useTheme } from './useTheme'

// Simple test to verify the hook exists and can be imported
describe('useTheme', () => {
  it('should be a function', () => {
    expect(typeof useTheme).toBe('function')
  })

  it('should use useContext internally', () => {
    // Verify that the hook implementation calls useContext
    // This tests that the hook is structured correctly
    const hookString = useTheme.toString()
    expect(hookString).toContain('useContext')
  })
})
