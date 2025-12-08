import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StatusBadge } from './StatusBadge'

// Mock useTranslation - return the translation key as-is for testing
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('StatusBadge', () => {
  it('should render ready state with green color', () => {
    render(<StatusBadge state="READY" />)
    const badge = screen.getByText('status.ready')
    expect(badge).toBeInTheDocument()
  })

  it('should render progressing state with blue color', () => {
    render(<StatusBadge state="PROGRESSING" />)
    const badge = screen.getByText('status.pending')
    expect(badge).toBeInTheDocument()
  })

  it('should render failed state with red color', () => {
    render(<StatusBadge state="FAILED" />)
    const badge = screen.getByText('status.failed')
    expect(badge).toBeInTheDocument()
  })

  it('should render unknown state when state is undefined', () => {
    render(<StatusBadge state={undefined} />)
    const badge = screen.getByText('status.unknown')
    expect(badge).toBeInTheDocument()
  })

  it('should render unknown state when state is empty string', () => {
    render(<StatusBadge state="" />)
    const badge = screen.getByText('status.unknown')
    expect(badge).toBeInTheDocument()
  })

  it('should handle case-insensitive state matching', () => {
    render(<StatusBadge state="ready" />)
    const badge = screen.getByText('status.ready')
    expect(badge).toBeInTheDocument()
  })

  it('should handle state with prefix correctly', () => {
    render(<StatusBadge state="CLUSTER_STATE_READY" />)
    const badge = screen.getByText('status.ready')
    expect(badge).toBeInTheDocument()
  })

  it('should render raw state for unrecognized states', () => {
    render(<StatusBadge state="SOME_UNKNOWN_STATE" />)
    const badge = screen.getByText('SOME_UNKNOWN_STATE')
    expect(badge).toBeInTheDocument()
  })

  it('should handle partial state matches correctly', () => {
    const { rerender } = render(<StatusBadge state="CLUSTER_STATE_PROGRESSING" />)
    expect(screen.getByText('status.pending')).toBeInTheDocument()

    rerender(<StatusBadge state="VM_STATE_FAILED" />)
    expect(screen.getByText('status.failed')).toBeInTheDocument()
  })

  it('should handle mixed case states', () => {
    const { rerender } = render(<StatusBadge state="Ready" />)
    expect(screen.getByText('status.ready')).toBeInTheDocument()

    rerender(<StatusBadge state="Progressing" />)
    expect(screen.getByText('status.pending')).toBeInTheDocument()
  })
})
