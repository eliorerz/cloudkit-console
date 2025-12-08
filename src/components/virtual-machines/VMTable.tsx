import {
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core'
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@patternfly/react-table'
import { EllipsisVIcon, PlayIcon, PowerOffIcon, RedoIcon, TrashIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import { VirtualMachine } from '../../types'
import { StatusBadge } from '../common/StatusBadge'

interface VMTableProps {
  vms: VirtualMachine[]
  activeSortIndex?: number
  activeSortDirection: 'asc' | 'desc'
  onSort: (event: React.SyntheticEvent, index: number, direction: 'asc' | 'desc') => void
  openActionMenuId: string | null
  onActionMenuToggle: (vmId: string) => void
  onActionMenuClose: () => void
  onDeleteClick: (vm: VirtualMachine) => void
  onRowClick: (vm: VirtualMachine) => void
}

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'N/A'
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return timestamp
  }
}

export const VMTable: React.FC<VMTableProps> = ({
  vms,
  activeSortIndex,
  activeSortDirection,
  onSort,
  openActionMenuId,
  onActionMenuToggle,
  onActionMenuClose,
  onDeleteClick,
  onRowClick,
}) => {
  const { t } = useTranslation(['virtualMachines', 'common'])

  return (
    <Table aria-label="Virtual Machines Table" variant="compact">
      <Thead>
        <Tr>
          <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 0 }}>
            {t('common:common.name')}
          </Th>
          <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 1 }}>
            {t('common:common.status')}
          </Th>
          <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 2 }}>
            {t('virtualMachines:list.columns.ip')}
          </Th>
          <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 3 }}>
            {t('virtualMachines:list.columns.hub')}
          </Th>
          <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 4 }}>
            {t('common:common.created')}
          </Th>
          <Th></Th>
        </Tr>
      </Thead>
      <Tbody>
        {vms.map((vm) => (
          <Tr key={vm.id} style={{ cursor: 'pointer' }}>
            <Td dataLabel={t('common:common.name')} onClick={() => onRowClick(vm)}>
              {vm.metadata?.name || vm.id}
            </Td>
            <Td dataLabel={t('common:common.status')} onClick={() => onRowClick(vm)}>
              <StatusBadge state={vm.status?.state} />
            </Td>
            <Td dataLabel={t('virtualMachines:list.columns.ip')} onClick={() => onRowClick(vm)}>
              {vm.status?.ip_address || 'N/A'}
            </Td>
            <Td dataLabel={t('virtualMachines:list.columns.hub')} onClick={() => onRowClick(vm)}>
              {vm.status?.hub || 'N/A'}
            </Td>
            <Td dataLabel={t('common:common.created')} onClick={() => onRowClick(vm)}>
              {formatTimestamp(vm.metadata?.creation_timestamp)}
            </Td>
            <Td isActionCell>
              <Dropdown
                isOpen={openActionMenuId === vm.id}
                onSelect={onActionMenuClose}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => onActionMenuToggle(vm.id)}
                    variant="plain"
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem key="start" onClick={() => { /* TODO: Implement start */ }} icon={<PlayIcon style={{ color: '#3e8635' }} />}>
                    {t('virtualMachines:start')}
                  </DropdownItem>
                  <DropdownItem key="stop" onClick={() => { /* TODO: Implement stop */ }} icon={<PowerOffIcon style={{ color: '#f0ab00' }} />}>
                    {t('virtualMachines:stop')}
                  </DropdownItem>
                  <DropdownItem key="restart" onClick={() => { /* TODO: Implement restart */ }} icon={<RedoIcon style={{ color: '#0066cc' }} />}>
                    {t('virtualMachines:restart')}
                  </DropdownItem>
                  <DropdownItem key="console" onClick={() => { /* TODO: Implement console */ }}>
                    {t('virtualMachines:console')}
                  </DropdownItem>
                  <DropdownItem key="delete" onClick={() => onDeleteClick(vm)} icon={<TrashIcon style={{ color: '#c9190b' }} />}>
                    {t('virtualMachines:delete')}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
