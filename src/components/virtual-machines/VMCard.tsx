import {
  Card,
  CardBody,
  Button,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core'
import { PlayIcon, PowerOffIcon, RedoIcon, TrashIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import { VirtualMachine } from '../../types'
import { StatusBadge } from '../common/StatusBadge'

interface VMCardProps {
  vm: VirtualMachine
  isActionMenuOpen: boolean
  onActionMenuToggle: (vmId: string) => void
  onActionMenuClose: () => void
  onDeleteClick: (vm: VirtualMachine) => void
  onClick: (vm: VirtualMachine) => void
}

const getImageName = (vm: VirtualMachine): string => {
  const params = vm.spec?.template_parameters as Record<string, { value?: unknown }> | undefined
  const imageSource = params?.vm_image_source?.value || params?.vm_image_source
  if (!imageSource || typeof imageSource !== 'string') return 'N/A'

  // Extract image name from containerdisk URL
  // e.g., "docker://quay.io/containerdisks/fedora:43" -> "Fedora 43"
  const match = imageSource.match(/\/([^/:]+):([^/:]+)$/)
  if (match) {
    const [, os, version] = match
    return `${os.charAt(0).toUpperCase() + os.slice(1)} ${version}`
  }

  return imageSource
}

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'N/A'
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return timestamp
  }
}

export const VMCard: React.FC<VMCardProps> = ({
  vm,
  isActionMenuOpen,
  onActionMenuToggle,
  onActionMenuClose,
  onDeleteClick,
  onClick,
}) => {
  const { t } = useTranslation(['virtualMachines', 'common'])

  return (
    <Card
      isCompact
      style={{
        border: '1px solid #d2d2d2',
        borderRadius: '18px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        maxWidth: '400px',
        minHeight: '250px',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={() => onClick(vm)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#0066cc'
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,102,204,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#d2d2d2'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <CardBody style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Top row: VM name and status */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#0066cc', fontSize: '1.25rem' }}>●</span>
            <div>
              <div style={{ fontWeight: 500, fontSize: '1.15rem', color: '#151515' }}>
                {vm.metadata?.name || vm.id}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                {vm.id}
              </div>
            </div>
          </div>
          <div>
            <StatusBadge state={vm.status?.state} />
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          marginBottom: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.6875rem', color: '#6a6e73', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              CPU
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#151515' }}>
              {(() => {
                const params = vm.spec?.template_parameters as Record<string, { value?: unknown }> | undefined
                const value = params?.vm_cpu_cores?.value || params?.vm_cpu_cores
                return value ? String(value) : 'N/A'
              })()} vCPU
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: '#6a6e73', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Memory
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#151515' }}>
              {(() => {
                const params = vm.spec?.template_parameters as Record<string, { value?: unknown }> | undefined
                const value = params?.vm_memory_size?.value || params?.vm_memory_size
                return value ? String(value) : 'N/A'
              })()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: '#6a6e73', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Storage
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#151515' }}>
              {(() => {
                const params = vm.spec?.template_parameters as Record<string, { value?: unknown }> | undefined
                const value = params?.vm_disk_size?.value || params?.vm_disk_size
                return value ? String(value) : 'N/A'
              })()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: '#6a6e73', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Image
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#151515' }}>
              {getImageName(vm)}
            </div>
          </div>
        </div>

        {/* Bottom row: Created timestamp */}
        <div style={{
          fontSize: '0.8125rem',
          color: '#6a6e73'
        }}>
          {t('virtualMachines:list.created')}: {formatTimestamp(vm.metadata?.creation_timestamp)}
        </div>

        {/* Spacer to push buttons to bottom */}
        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <Dropdown
            isOpen={isActionMenuOpen}
            onSelect={onActionMenuClose}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={(e) => {
                  e.stopPropagation()
                  onActionMenuToggle(vm.id)
                }}
                variant="primary"
                size="sm"
              >
                {t('common:common.actions')}
              </MenuToggle>
            )}
          >
            <DropdownList>
              <DropdownItem key="start" onClick={(e) => { e?.stopPropagation(); }} icon={<PlayIcon style={{ color: '#3e8635' }} />}>
                {t('virtualMachines:start')}
              </DropdownItem>
              <DropdownItem key="stop" onClick={(e) => { e?.stopPropagation(); }} icon={<PowerOffIcon style={{ color: '#f0ab00' }} />}>
                {t('virtualMachines:stop')}
              </DropdownItem>
              <DropdownItem key="restart" onClick={(e) => { e?.stopPropagation(); }} icon={<RedoIcon style={{ color: '#0066cc' }} />}>
                {t('virtualMachines:restart')}
              </DropdownItem>
              <DropdownItem key="delete" onClick={(e) => { e?.stopPropagation(); onDeleteClick(vm); }} icon={<TrashIcon style={{ color: '#c9190b' }} />}>
                {t('virtualMachines:delete')}
              </DropdownItem>
            </DropdownList>
          </Dropdown>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Implement console action
            }}
          >
            {t('virtualMachines:console')}
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onClick(vm)
            }}
          >
            {t('virtualMachines:list.viewDetails')}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
