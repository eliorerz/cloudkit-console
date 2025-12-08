import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useConfirmDialog } from './useConfirmDialog'

interface TestItem {
  id: string
  name: string
}

describe('useConfirmDialog', () => {
  it('should initialize with closed state', () => {
    const { result } = renderHook(() => useConfirmDialog<TestItem>())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.item).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should open dialog with item', () => {
    const { result } = renderHook(() => useConfirmDialog<TestItem>())
    const testItem: TestItem = { id: '1', name: 'Test Item' }

    act(() => {
      result.current.open(testItem)
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.item).toEqual(testItem)
    expect(result.current.isLoading).toBe(false)
  })

  it('should close dialog and reset state', () => {
    const { result } = renderHook(() => useConfirmDialog<TestItem>())
    const testItem: TestItem = { id: '1', name: 'Test Item' }

    act(() => {
      result.current.open(testItem)
    })

    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.close()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.item).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle confirm action with successful callback', async () => {
    const { result } = renderHook(() => useConfirmDialog<TestItem>())
    const testItem: TestItem = { id: '1', name: 'Test Item' }
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    act(() => {
      result.current.open(testItem)
    })

    await act(async () => {
      await result.current.confirm(onConfirm)
    })

    expect(onConfirm).toHaveBeenCalledWith(testItem)
    expect(result.current.isOpen).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should set loading state during confirm and keep dialog open on error', async () => {
    const { result } = renderHook(() => useConfirmDialog<TestItem>())
    const testItem: TestItem = { id: '1', name: 'Test Item' }
    const onConfirm = vi.fn().mockRejectedValue(new Error('Failed'))

    act(() => {
      result.current.open(testItem)
    })

    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      try {
        await result.current.confirm(onConfirm)
      } catch {
        // Expected to throw
      }
    })

    expect(onConfirm).toHaveBeenCalledWith(testItem)
    expect(result.current.isOpen).toBe(true)
    expect(result.current.isLoading).toBe(false)

    consoleError.mockRestore()
  })

  it('should allow manual loading state control', () => {
    const { result } = renderHook(() => useConfirmDialog<TestItem>())
    const testItem: TestItem = { id: '1', name: 'Test Item' }

    act(() => {
      result.current.open(testItem)
      result.current.setLoading(true)
    })

    expect(result.current.isLoading).toBe(true)

    act(() => {
      result.current.setLoading(false)
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should handle generic type correctly', () => {
    const { result } = renderHook(() => useConfirmDialog<string>())

    act(() => {
      result.current.open('test-id')
    })

    expect(result.current.item).toBe('test-id')
  })

  it('should not execute confirm if no item is set', async () => {
    const { result } = renderHook(() => useConfirmDialog<TestItem>())
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    await act(async () => {
      await result.current.confirm(onConfirm)
    })

    expect(onConfirm).not.toHaveBeenCalled()
  })
})
