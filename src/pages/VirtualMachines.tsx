import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Label,
  Button,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Pagination,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  ButtonVariant,
  Flex,
  FlexItem,
} from '@patternfly/react-core'
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table'
import { VirtualMachineIcon, SearchIcon, EllipsisVIcon, ThIcon, ListIcon, PlayIcon, PowerOffIcon, RedoIcon, DesktopIcon, TrashIcon, CpuIcon, MemoryIcon, DatabaseIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getVirtualMachines, deleteVirtualMachine, createVirtualMachine } from '../api/vms'
import { getTemplates } from '../api/templates'
import { VirtualMachine, Template } from '../api/types'
import { CreateVMWizard } from '../components/wizards/CreateVMWizard'
import osImagesConfig from '../config/os-images.json'

type ViewType = 'cards' | 'table'

// Helper function to get OS icon from image source
const getOSIcon = (vm: VirtualMachine): string | null => {
  const imageSource = vm.spec?.template_parameters?.vm_image_source?.value || vm.spec?.template_parameters?.vm_image_source
  if (!imageSource) return null

  // Try to match the image source with known OS images
  for (const osImage of osImagesConfig.images) {
    if (imageSource.includes(osImage.repository)) {
      return osImage.icon
    }
  }

  // Fallback: try to detect OS from image path
  const imageLower = imageSource.toLowerCase()
  if (imageLower.includes('ubuntu')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo-ubuntu_cof-orange-hex.svg'
  } else if (imageLower.includes('fedora')) {
    return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fedora/fedora-original.svg'
  } else if (imageLower.includes('centos')) {
    return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/centos/centos-original.svg'
  } else if (imageLower.includes('debian')) {
    return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg'
  }

  return null
}

const VirtualMachines: React.FC = () => {
  const navigate = useNavigate()
  const [vms, setVms] = useState<VirtualMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [vmToDelete, setVmToDelete] = useState<VirtualMachine | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [viewType, setViewType] = useState<ViewType>('cards')

  // Create VM wizard
  const [wizardOpen, setWizardOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])

  // Sorting
  const [activeSortIndex, setActiveSortIndex] = useState<number | undefined>(undefined)
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    const fetchVMs = async () => {
      if (isInitialLoad) {
        setLoading(true)
      }
      try {
        const response = await getVirtualMachines()
        setVms(response.items || [])
      } catch (error) {
        console.error('Error fetching VMs:', error)
        setVms([])
      } finally {
        if (isInitialLoad) {
          setLoading(false)
          setIsInitialLoad(false)
        }
      }
    }

    fetchVMs()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchVMs, 30000)
    return () => clearInterval(interval)
  }, [isInitialLoad])

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await getTemplates()
        setTemplates(response.items || [])
      } catch (error) {
        console.error('Error fetching templates:', error)
        setTemplates([])
      }
    }

    fetchTemplates()
  }, [])

  const getStateBadge = (state?: string) => {
    if (!state) return <Label color="grey">Unknown</Label>

    const normalizedState = state.toUpperCase()

    if (normalizedState.includes('READY')) {
      return <Label color="green">Ready</Label>
    } else if (normalizedState.includes('PROGRESSING')) {
      return <Label color="blue">Progressing</Label>
    } else if (normalizedState.includes('FAILED')) {
      return <Label color="red">Failed</Label>
    }

    return <Label color="grey">{state}</Label>
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A'
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  const handleDeleteClick = (vm: VirtualMachine) => {
    setVmToDelete(vm)
    setDeleteModalOpen(true)
    setOpenActionMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!vmToDelete) return

    try {
      setDeleting(true)
      await deleteVirtualMachine(vmToDelete.id)
      setVms(vms.filter(v => v.id !== vmToDelete.id))
      setDeleteModalOpen(false)
      setVmToDelete(null)
    } catch (error) {
      console.error('Error deleting VM:', error)
      alert('Failed to delete virtual machine')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateVMClick = () => {
    setWizardOpen(true)
  }

  const handleCreateVM = async (vmId: string, templateId: string, parameters: Record<string, any>) => {
    console.log('Creating VM with name:', vmId)
    console.log('Creating VM with parameters:', JSON.stringify(parameters, null, 2))

    // Filter out empty/null/undefined values
    const filteredParameters: Record<string, any> = {}
    for (const [key, value] of Object.entries(parameters)) {
      if (value !== undefined && value !== null && value !== '') {
        filteredParameters[key] = value
      }
    }

    const newVm = await createVirtualMachine({
      metadata: {
        name: vmId,
      },
      spec: {
        template: templateId,
        template_parameters: Object.keys(filteredParameters).length > 0 ? filteredParameters : undefined,
      },
    })
    setVms([...vms, newVm])
    // Refresh the VM list to show the new VM
    const response = await getVirtualMachines()
    setVms(response.items || [])
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

  const onSort = (_event: any, index: number, direction: 'asc' | 'desc') => {
    setActiveSortIndex(index)
    setActiveSortDirection(direction)
  }

  // Filter and sort
  let filteredVMs = vms.filter(vm => {
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
      gridTemplateColumns: 'repeat(auto-fill, 396px)',
      gap: '1rem',
      width: '100%',
      padding: '0'
    }}>
      {paginatedVMs.map((vm) => {
        const osIcon = getOSIcon(vm)

        return (
        <Card
          key={vm.id}
          style={{
            height: '320px',
            width: '396px',
            border: '1px solid #d2d2d2',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={() => handleRowClick(vm)}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <CardBody style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header with OS icon, name, state and actions */}
            <div style={{ marginBottom: '1rem' }}>
              <Flex alignItems={{ default: 'alignItemsCenter' }} justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                <FlexItem flex={{ default: 'flex_1' }}>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      {osIcon ? (
                        <img
                          src={osIcon}
                          alt="OS Logo"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            // Fallback to generic icon on error
                            const target = e.currentTarget
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `
                                <svg width="48" height="48" viewBox="0 0 48 48">
                                  <rect x="4" y="4" width="40" height="40" rx="4" fill="#E8F4F8"/>
                                  <circle cx="16" cy="16" r="6" fill="#FF6B6B"/>
                                  <circle cx="32" cy="16" r="6" fill="#4ECDC4"/>
                                  <circle cx="16" cy="32" r="6" fill="#45B7D1"/>
                                  <circle cx="32" cy="32" r="6" fill="#FFA07A"/>
                                  <rect x="20" y="20" width="8" height="8" rx="1" fill="#96CEB4"/>
                                </svg>
                              `
                            }
                          }}
                        />
                      ) : (
                        <svg width="48" height="48" viewBox="0 0 48 48">
                          <rect x="4" y="4" width="40" height="40" rx="4" fill="#E8F4F8"/>
                          <circle cx="16" cy="16" r="6" fill="#FF6B6B"/>
                          <circle cx="32" cy="16" r="6" fill="#4ECDC4"/>
                          <circle cx="16" cy="32" r="6" fill="#45B7D1"/>
                          <circle cx="32" cy="32" r="6" fill="#FFA07A"/>
                          <rect x="20" y="20" width="8" height="8" rx="1" fill="#96CEB4"/>
                        </svg>
                      )}
                    </FlexItem>
                    <FlexItem>
                      <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#151515', marginBottom: '0.15rem' }}>
                        {vm.metadata?.name || vm.id}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6a6e73' }}>
                        {vm.id}
                      </div>
                    </FlexItem>
                  </Flex>
                </FlexItem>
                <FlexItem>
                  <Dropdown
                    isOpen={openActionMenuId === vm.id}
                    onSelect={() => setOpenActionMenuId(null)}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenActionMenuId(openActionMenuId === vm.id ? null : vm.id)
                        }}
                        variant="plain"
                      >
                        <EllipsisVIcon />
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      <DropdownItem key="start" onClick={(e) => { e?.stopPropagation(); }} icon={<PlayIcon style={{ color: '#3e8635' }} />}>
                        Start
                      </DropdownItem>
                      <DropdownItem key="stop" onClick={(e) => { e?.stopPropagation(); }} icon={<PowerOffIcon style={{ color: '#f0ab00' }} />}>
                        Stop
                      </DropdownItem>
                      <DropdownItem key="restart" onClick={(e) => { e?.stopPropagation(); }} icon={<RedoIcon style={{ color: '#0066cc' }} />}>
                        Restart
                      </DropdownItem>
                      <DropdownItem key="console" onClick={(e) => { e?.stopPropagation(); }} icon={<DesktopIcon />}>
                        Console
                      </DropdownItem>
                      <DropdownItem key="delete" onClick={(e) => { e?.stopPropagation(); handleDeleteClick(vm); }} icon={<TrashIcon style={{ color: '#c9190b' }} />}>
                        Delete
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </FlexItem>
              </Flex>
            </div>

            {/* VM Details */}
            <div style={{ fontSize: '0.875rem', color: '#6a6e73', flex: 1, paddingLeft: '0.5rem' }}>
              <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong>IP Address:</strong> {vm.status?.ip_address || 'N/A'}
                </div>
                {getStateBadge(vm.status?.state)}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Hub:</strong> {vm.status?.hub || 'N/A'}
              </div>
              <div>
                <strong>Created:</strong> {formatTimestamp(vm.metadata?.creation_timestamp)}
              </div>
            </div>

            {/* Hardware specs at bottom */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 'auto',
              minHeight: '100px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: '3rem', color: '#06c', lineHeight: '1' }}>
                  <CpuIcon />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#151515', marginTop: '-0.25rem' }}>
                  {vm.spec?.template_parameters?.vm_cpu_cores?.value || vm.spec?.template_parameters?.vm_cpu_cores || 'N/A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6a6e73', paddingTop: '0.25rem' }}>
                  vCPU Cores
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: '3rem', color: '#06c', lineHeight: '1' }}>
                  <MemoryIcon />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#151515', marginTop: '-0.25rem' }}>
                  {vm.spec?.template_parameters?.vm_memory_size?.value || vm.spec?.template_parameters?.vm_memory_size || 'N/A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6a6e73', paddingTop: '0.25rem' }}>
                  Memory
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: '3rem', color: '#06c', lineHeight: '1' }}>
                  <DatabaseIcon />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#151515', marginTop: '-0.25rem' }}>
                  {vm.spec?.template_parameters?.vm_disk_size?.value || vm.spec?.template_parameters?.vm_disk_size || 'N/A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6a6e73', paddingTop: '0.25rem' }}>
                  Disk Size
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
        )
      })}
    </div>
  )

  return (
    <AppLayout>
      <PageSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Title headingLevel="h1" size="2xl">
            Virtual Machines
          </Title>
          <Button variant="primary" onClick={handleCreateVMClick}>
            Create VM
          </Button>
        </div>

        <Card>
          <Toolbar style={{ padding: '1rem 1.5rem' }}>
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  placeholder="Search by name, IP, or hub"
                  value={searchValue}
                  onChange={(_event, value) => setSearchValue(value)}
                  onClear={() => setSearchValue('')}
                  style={{ width: '400px' }}
                />
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
                      Cards
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant={viewType === 'table' ? ButtonVariant.primary : ButtonVariant.secondary}
                      icon={<ListIcon />}
                      onClick={() => setViewType('table')}
                      size="sm"
                    >
                      Table
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
                <p style={{ marginTop: '1rem', color: '#6a6e73' }}>Loading virtual machines...</p>
              </div>
            ) : filteredVMs.length === 0 ? (
              <EmptyState>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {vms.length === 0 ? <VirtualMachineIcon /> : <SearchIcon />}
                </div>
                <Title headingLevel="h4" size="lg">
                  {vms.length === 0 ? "No virtual machines" : "No results found"}
                </Title>
                <EmptyStateBody>
                  {vms.length === 0
                    ? "There are no virtual machines to display. Create a virtual machine to get started."
                    : "No virtual machines match your search criteria. Try adjusting your filters."}
                </EmptyStateBody>
              </EmptyState>
            ) : viewType === 'cards' ? (
              renderCardsView()
            ) : (
              <Table aria-label="Virtual Machines Table" variant="compact">
                <Thead>
                  <Tr>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 0 }}>
                      Name
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 1 }}>
                      State
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 2 }}>
                      IP Address
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 3 }}>
                      Hub
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 4 }}>
                      Created
                    </Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedVMs.map((vm) => (
                    <Tr key={vm.id} style={{ cursor: 'pointer' }}>
                      <Td dataLabel="Name" onClick={() => handleRowClick(vm)}>{vm.metadata?.name || vm.id}</Td>
                      <Td dataLabel="State" onClick={() => handleRowClick(vm)}>{getStateBadge(vm.status?.state)}</Td>
                      <Td dataLabel="IP Address" onClick={() => handleRowClick(vm)}>{vm.status?.ip_address || 'N/A'}</Td>
                      <Td dataLabel="Hub" onClick={() => handleRowClick(vm)}>{vm.status?.hub || 'N/A'}</Td>
                      <Td dataLabel="Created" onClick={() => handleRowClick(vm)}>{formatTimestamp(vm.metadata?.creation_timestamp)}</Td>
                      <Td isActionCell>
                        <Dropdown
                          isOpen={openActionMenuId === vm.id}
                          onSelect={() => setOpenActionMenuId(null)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              onClick={() => setOpenActionMenuId(openActionMenuId === vm.id ? null : vm.id)}
                              variant="plain"
                            >
                              <EllipsisVIcon />
                            </MenuToggle>
                          )}
                        >
                          <DropdownList>
                            <DropdownItem onClick={() => handleDeleteClick(vm)}>
                              Delete
                            </DropdownItem>
                          </DropdownList>
                        </Dropdown>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
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

      <Modal
        variant={ModalVariant.small}
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        aria-labelledby="delete-vm-modal-title"
      >
        <ModalHeader title="Delete virtual machine" labelId="delete-vm-modal-title" />
        <ModalBody>
          Are you sure you want to delete the virtual machine <strong>{vmToDelete?.id}</strong>? This action cannot be undone.
        </ModalBody>
        <ModalFooter>
          <Button key="cancel" variant="link" onClick={() => setDeleteModalOpen(false)} isDisabled={deleting}>
            Cancel
          </Button>
          <Button
            key="confirm"
            variant="danger"
            onClick={handleDeleteConfirm}
            isDisabled={deleting}
            isLoading={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>

      <CreateVMWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={handleCreateVM}
        templates={templates}
      />
    </AppLayout>
  )
}

export default VirtualMachines
