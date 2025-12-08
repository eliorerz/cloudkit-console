import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import {
  PageSection,
  Title,
  Card,
  CardBody,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Button,
  Pagination,
  ButtonVariant,
  Flex,
  FlexItem,
} from '@patternfly/react-core'
import { VirtualMachineIcon, SearchIcon, FilterIcon, ThIcon, ListIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { VirtualMachine } from '../types'
import { VMCard } from '../components/virtual-machines/VMCard'
import { VMTable } from '../components/virtual-machines/VMTable'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { getVirtualMachines, deleteVirtualMachine } from '../api/vms'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { logger } from '@/utils/logger'

type ViewType = 'cards' | 'table'

const VirtualMachines: React.FC = () => {
  const { t } = useTranslation(['virtualMachines', 'common'])
  const navigate = useNavigate()
  const { username } = useAuth()

  // State management
  const [vms, setVms] = useState<VirtualMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteDialog = useConfirmDialog<VirtualMachine>()

  const [searchValue, setSearchValue] = useState('')
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [viewType, setViewType] = useState<ViewType>('cards')
  const [showOnlyMyVMs, setShowOnlyMyVMs] = useState(false)

  // Sorting
  const [activeSortIndex, setActiveSortIndex] = useState<number | undefined>(undefined)
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Fetch VMs
  const fetchVMs = useCallback(async () => {
    try {
      const response = await getVirtualMachines()
      setVms(response.items || [])
    } catch (error) {
      logger.error('Error fetching VMs', error)
      setVms([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh VMs every 30 seconds
  useEffect(() => {
    fetchVMs()
    const interval = setInterval(fetchVMs, 30000)
    return () => clearInterval(interval)
  }, [fetchVMs])

  // Reset pagination when search or filter changes
  useEffect(() => {
    setPage(1)
  }, [searchValue, showOnlyMyVMs])

  const handleDeleteClick = (vm: VirtualMachine) => {
    deleteDialog.open(vm)
    setOpenActionMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.item) return

    try {
      setIsDeleting(true)
      await deleteVirtualMachine(deleteDialog.item.id)
      setVms(prevVms => prevVms.filter(vm => vm.id !== deleteDialog.item!.id))
      deleteDialog.close()
    } catch (error) {
      logger.error('Error deleting VM', error)
      alert('Failed to delete virtual machine')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateVMClick = () => {
    navigate('/templates')
  }

  const handleRowClick = (vm: VirtualMachine) => {
    navigate(`/virtual-machines/${vm.id}`)
  }

  // Sorting logic
  const getSortableValue = (vm: VirtualMachine, columnIndex: number): string => {
    switch (columnIndex) {
      case 0: return vm.metadata?.name || vm.id
      case 1: return vm.status?.state || ''
      case 2: return vm.status?.ip_address || ''
      case 3: return vm.status?.hub || ''
      case 4: return vm.metadata?.creation_timestamp || ''
      default: return ''
    }
  }

  const onSort = (_event: React.SyntheticEvent, index: number, direction: 'asc' | 'desc') => {
    setActiveSortIndex(index)
    setActiveSortDirection(direction)
  }

  // Filter and sort
  let filteredVMs = vms.filter(vm => {
    // Filter by "My VMs"
    if (showOnlyMyVMs && username) {
      const creators = vm.metadata?.creators || []
      if (!creators.includes(username)) {
        return false
      }
    }

    // Filter by search
    if (!searchValue) return true
    const searchLower = searchValue.toLowerCase()
    return (
      vm.id.toLowerCase().includes(searchLower) ||
      vm.metadata?.name?.toLowerCase().includes(searchLower) ||
      vm.status?.ip_address?.toLowerCase().includes(searchLower) ||
      vm.status?.hub?.toLowerCase().includes(searchLower) ||
      vm.spec?.template?.toLowerCase().includes(searchLower)
    )
  })

  if (activeSortIndex !== undefined) {
    filteredVMs = [...filteredVMs].sort((a, b) => {
      const aValue = getSortableValue(a, activeSortIndex)
      const bValue = getSortableValue(b, activeSortIndex)
      if (activeSortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      }
      return bValue.localeCompare(aValue)
    })
  }

  // Pagination
  const totalItems = filteredVMs.length
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedVMs = filteredVMs.slice(startIndex, endIndex)

  const renderCardsView = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, 400px)',
      gap: '0.75rem',
      width: '100%',
      justifyContent: 'start'
    }}>
      {paginatedVMs.map((vm) => (
        <VMCard
          key={vm.id}
          vm={vm}
          isActionMenuOpen={openActionMenuId === vm.id}
          onActionMenuToggle={(vmId) => setOpenActionMenuId(openActionMenuId === vmId ? null : vmId)}
          onActionMenuClose={() => setOpenActionMenuId(null)}
          onDeleteClick={handleDeleteClick}
          onClick={handleRowClick}
        />
      ))}
    </div>
  )

  return (
    <AppLayout>
      <PageSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Title headingLevel="h1" size="2xl">
            {t('virtualMachines:title')}
          </Title>
          <Button variant="primary" onClick={handleCreateVMClick}>
            {t('virtualMachines:list.createVM')}
          </Button>
        </div>

        <Card>
          <Toolbar style={{ padding: '1rem 1.5rem' }}>
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  placeholder={t('virtualMachines:list.searchPlaceholder')}
                  value={searchValue}
                  onChange={(_event, value) => setSearchValue(value)}
                  onClear={() => setSearchValue('')}
                  style={{ width: '400px' }}
                />
              </ToolbarItem>
              <ToolbarItem>
                <Button
                  variant={showOnlyMyVMs ? ButtonVariant.primary : ButtonVariant.secondary}
                  icon={<FilterIcon />}
                  onClick={() => setShowOnlyMyVMs(!showOnlyMyVMs)}
                  size="sm"
                >
                  {t('virtualMachines:list.myVMs')}
                </Button>
              </ToolbarItem>
              <ToolbarItem>
                <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <Button
                      variant={viewType === 'cards' ? ButtonVariant.primary : ButtonVariant.secondary}
                      icon={<ThIcon />}
                      onClick={() => setViewType('cards')}
                      size="sm"
                    >
                      {t('virtualMachines:list.viewCards')}
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant={viewType === 'table' ? ButtonVariant.primary : ButtonVariant.secondary}
                      icon={<ListIcon />}
                      onClick={() => setViewType('table')}
                      size="sm"
                    >
                      {t('virtualMachines:list.viewTable')}
                    </Button>
                  </FlexItem>
                </Flex>
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>

          <CardBody>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="xl" />
                <p style={{ marginTop: '1rem', color: '#6a6e73' }}>{t('virtualMachines:list.loading')}</p>
              </div>
            ) : filteredVMs.length === 0 ? (
              <EmptyState>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {vms.length === 0 ? <VirtualMachineIcon /> : <SearchIcon />}
                </div>
                <Title headingLevel="h4" size="lg">
                  {vms.length === 0 ? t('virtualMachines:list.empty') : t('virtualMachines:list.noResults')}
                </Title>
                <EmptyStateBody>
                  {vms.length === 0
                    ? t('virtualMachines:list.emptyDescription')
                    : t('virtualMachines:list.noResultsDescription')}
                </EmptyStateBody>
              </EmptyState>
            ) : viewType === 'cards' ? (
              renderCardsView()
            ) : (
              <VMTable
                vms={paginatedVMs}
                activeSortIndex={activeSortIndex}
                activeSortDirection={activeSortDirection}
                onSort={onSort}
                openActionMenuId={openActionMenuId}
                onActionMenuToggle={(vmId) => setOpenActionMenuId(openActionMenuId === vmId ? null : vmId)}
                onActionMenuClose={() => setOpenActionMenuId(null)}
                onDeleteClick={handleDeleteClick}
                onRowClick={handleRowClick}
              />
            )}
          </CardBody>

          {filteredVMs.length > 0 && (
            <Toolbar>
              <ToolbarContent style={{ paddingRight: '1rem' }}>
                <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
                  <Pagination
                    itemCount={totalItems}
                    perPage={perPage}
                    page={page}
                    onSetPage={(_event, pageNumber) => setPage(pageNumber)}
                    onPerPageSelect={(_event, newPerPage) => {
                      setPerPage(newPerPage)
                      setPage(1)
                    }}
                    variant="bottom"
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          )}
        </Card>
      </PageSection>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={t('virtualMachines:delete')}
        message={t('virtualMachines:list.deleteConfirm', { name: deleteDialog.item?.id })}
        confirmLabel={isDeleting ? t('virtualMachines:list.deleting') : t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={deleteDialog.close}
      />
    </AppLayout>
  )
}

export default VirtualMachines
