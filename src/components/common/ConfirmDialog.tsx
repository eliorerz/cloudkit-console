import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  ButtonVariant,
} from '@patternfly/react-core'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onCancel}
      aria-label={title}
    >
      <ModalHeader title={title} />
      <ModalBody>{message}</ModalBody>
      <ModalFooter>
        <Button
          variant={variant as ButtonVariant}
          onClick={onConfirm}
          isDisabled={isLoading}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
        <Button variant="link" onClick={onCancel} isDisabled={isLoading}>
          {cancelLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
