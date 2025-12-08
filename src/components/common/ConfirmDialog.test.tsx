import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
    variant: 'danger' as const,
  }

  it('should render dialog when open', () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should not render dialog when closed', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
  })

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    const confirmButton = screen.getByText('Confirm')
    await user.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('should disable buttons when loading', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />)

    const confirmButton = screen.getByRole('button', { name: /Confirm/i })
    const cancelButton = screen.getByRole('button', { name: /Cancel/i })

    expect(confirmButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it('should render with warning variant', () => {
    render(<ConfirmDialog {...defaultProps} variant="warning" />)

    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
  })

  it('should render with custom labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
      />
    )

    expect(screen.getByText('Yes, Delete')).toBeInTheDocument()
    expect(screen.getByText('No, Keep')).toBeInTheDocument()
  })

  it('should render with custom message', () => {
    const customMessage = 'This action cannot be undone. Are you absolutely sure?'

    render(<ConfirmDialog {...defaultProps} message={customMessage} />)

    expect(screen.getByText(customMessage)).toBeInTheDocument()
  })

  it('should not call handlers when buttons are disabled', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        {...defaultProps}
        isLoading={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    const confirmButton = screen.getByText('Confirm')
    const cancelButton = screen.getByText('Cancel')

    await user.click(confirmButton)
    await user.click(cancelButton)

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('should handle multiple clicks on confirm button', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    const confirmButton = screen.getByText('Confirm')

    await user.click(confirmButton)
    await user.click(confirmButton)
    await user.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledTimes(3)
  })

  it('should render with long message text', () => {
    const longMessage =
      'This is a very long message that explains in detail what will happen when you confirm this action. It should wrap properly within the dialog and maintain readability.'

    render(<ConfirmDialog {...defaultProps} message={longMessage} />)

    expect(screen.getByText(longMessage)).toBeInTheDocument()
  })
})
