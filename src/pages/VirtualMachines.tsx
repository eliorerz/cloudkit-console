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
  Form,
  FormGroup,
  TextInput,
} from '@patternfly/react-core'
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table'
import { VirtualMachineIcon, SearchIcon, EllipsisVIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getVirtualMachines, deleteVirtualMachine, createVirtualMachine } from '../api/vms'
import { getTemplates } from '../api/templates'
import { VirtualMachine, Template } from '../api/types'

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

  // Create VM modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newVmId, setNewVmId] = useState('')
  const [newVmTemplate, setNewVmTemplate] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)

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

  const handleCreateClick = () => {
    setNewVmId('')
    setNewVmTemplate('')
    setCreateModalOpen(true)
  }

  const handleCreateConfirm = async () => {
    if (!newVmId || !newVmTemplate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setCreating(true)
      const newVm = await createVirtualMachine({
        id: newVmId,
        spec: {
          template: newVmTemplate,
        },
      })
      setVms([...vms, newVm])
      setCreateModalOpen(false)
      setNewVmId('')
      setNewVmTemplate('')
      // Navigate to the new VM detail page
      navigate(`/virtual-machines/${newVm.id}`)
    } catch (error) {
      console.error('Error creating VM:', error)
      alert('Failed to create virtual machine')
    } finally {
      setCreating(false)
    }
  }

  const handleRowClick = (vm: VirtualMachine) => {
    navigate(`/virtual-machines/${vm.id}`)
  }

  // Sorting logic
  const getSortableValue = (vm: VirtualMachine, columnIndex: number): string => {
    switch (columnIndex) {
      case 0: return vm.id
      case 1: return vm.status?.state || ''
      case 2: return vm.status?.ip_address || ''
      case 3: return vm.status?.hub || ''
      case 4: return vm.spec?.template || ''
      case 5: return vm.metadata?.creation_timestamp || ''
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

  return (
    <AppLayout>
      <PageSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Title headingLevel="h1" size="2xl">
            Virtual Machines
          </Title>
          <Button variant="primary" onClick={handleCreateClick}>
            Create VM
          </Button>
        </div>

        <Card>
          <Toolbar style={{ padding: '1rem 1.5rem' }}>
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  placeholder="Search by name, IP, hub, or template"
                  value={searchValue}
                  onChange={(_event, value) => setSearchValue(value)}
                  onClear={() => setSearchValue('')}
                  style={{ width: '400px' }}
                />
              </ToolbarItem>
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
                  variant="top"
                />
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
                      Template
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 5 }}>
                      Created
                    </Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedVMs.map((vm) => (
                    <Tr key={vm.id} style={{ cursor: 'pointer' }}>
                      <Td dataLabel="Name" onClick={() => handleRowClick(vm)}>{vm.id}</Td>
                      <Td dataLabel="State" onClick={() => handleRowClick(vm)}>{getStateBadge(vm.status?.state)}</Td>
                      <Td dataLabel="IP Address" onClick={() => handleRowClick(vm)}>{vm.status?.ip_address || 'N/A'}</Td>
                      <Td dataLabel="Hub" onClick={() => handleRowClick(vm)}>{vm.status?.hub || 'N/A'}</Td>
                      <Td dataLabel="Template" onClick={() => handleRowClick(vm)}>{vm.spec?.template || 'N/A'}</Td>
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
              <ToolbarContent>
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
        title="Delete virtual machine"
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      >
        <p>Are you sure you want to delete the virtual machine <strong>{vmToDelete?.id}</strong>? This action cannot be undone.</p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
        </div>
      </Modal>

      <Modal
        variant={ModalVariant.medium}
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      >
        <ModalHeader title="Create virtual machine" />
        <ModalBody>
          <Form>
            <FormGroup label="VM ID" isRequired fieldId="vm-id">
              <TextInput
                isRequired
                type="text"
                id="vm-id"
                name="vm-id"
                value={newVmId}
                onChange={(_event, value) => setNewVmId(value)}
                placeholder="e.g., my-vm-1"
              />
            </FormGroup>
            <FormGroup label="Template" isRequired fieldId="vm-template">
              <Dropdown
                isOpen={templateDropdownOpen}
                onSelect={(_, value) => {
                  setNewVmTemplate(value as string)
                  setTemplateDropdownOpen(false)
                }}
                onOpenChange={(isOpen) => setTemplateDropdownOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                    isExpanded={templateDropdownOpen}
                    style={{ width: '100%' }}
                  >
                    {newVmTemplate || 'Select a template'}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  {templates.length > 0 ? (
                    templates.map((template) => (
                      <DropdownItem key={template.id} value={template.id}>
                        {template.title || template.id}
                      </DropdownItem>
                    ))
                  ) : (
                    <DropdownItem isDisabled>No templates available</DropdownItem>
                  )}
                </DropdownList>
              </Dropdown>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleCreateConfirm} isDisabled={creating || !newVmId || !newVmTemplate} isLoading={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
          <Button variant="link" onClick={() => setCreateModalOpen(false)} isDisabled={creating}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  )
}

export default VirtualMachines
