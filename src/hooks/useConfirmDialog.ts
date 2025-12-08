import { useState, useCallback } from 'react'
import { logger } from '@/utils/logger'

interface ConfirmDialogState<T = unknown> {
  isOpen: boolean
  item: T | null
  isLoading: boolean
}

interface UseConfirmDialogReturn<T = unknown> {
  isOpen: boolean
  item: T | null
  isLoading: boolean
  open: (item: T) => void
  close: () => void
  confirm: (handler: (item: T) => Promise<void>) => Promise<void>
  setLoading: (loading: boolean) => void
}

/**
 * Custom hook for managing confirmation dialog state
 * @returns Dialog state and control functions
 */
export function useConfirmDialog<T = unknown>(): UseConfirmDialogReturn<T> {
  const [state, setState] = useState<ConfirmDialogState<T>>({
    isOpen: false,
    item: null,
    isLoading: false,
  })

  const open = useCallback((item: T) => {
    setState({
      isOpen: true,
      item,
      isLoading: false,
    })
  }, [])

  const close = useCallback(() => {
    setState({
      isOpen: false,
      item: null,
      isLoading: false,
    })
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
    }))
  }, [])

  const confirm = useCallback(
    async (handler: (item: T) => Promise<void>) => {
      if (!state.item) return

      try {
        setState(prev => ({ ...prev, isLoading: true }))
        await handler(state.item)
        close()
      } catch (error) {
        logger.error('Confirm action failed', error)
        setState(prev => ({ ...prev, isLoading: false }))
        throw error
      }
    },
    [state.item, close]
  )

  return {
    isOpen: state.isOpen,
    item: state.item,
    isLoading: state.isLoading,
    open,
    close,
    confirm,
    setLoading,
  }
}
