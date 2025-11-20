import { useEffect, useState } from 'react'
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
  Pagination,
  Flex,
  FlexItem,
  Button,
  ButtonVariant,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Form,
  FormGroup,
  TextInput,
  Alert,
  ValidatedOptions,
  ExpandableSection,
} from '@patternfly/react-core'
import { CubeIcon, SearchIcon, CpuIcon, MemoryIcon, DatabaseIcon, ThIcon, ThLargeIcon, RocketIcon, EditIcon } from '@patternfly/react-icons'
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ExpandableRowContent,
} from '@patternfly/react-table'
import AppLayout from '../components/layouts/AppLayout'
import { getTemplates } from '../api/templates'
import { Template } from '../api/types'
import { createVirtualMachine } from '../api/vms'
import { CreateVMWizard } from '../components/wizards/CreateVMWizard'
import { getOSImages, OSImage } from '../api/os-images'

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCreateVMWizardOpen, setIsCreateVMWizardOpen] = useState(false)

  // Quick Create VM from template state
  const [isQuickCreateModalOpen, setIsQuickCreateModalOpen] = useState(false)
  const [vmName, setVmName] = useState('')
  const [vmNameValidated, setVmNameValidated] = useState<ValidatedOptions>(ValidatedOptions.default)
  const [isCreatingVM, setIsCreatingVM] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Parameters expandable section state
  const [isParametersExpanded, setIsParametersExpanded] = useState(false)

  // OS Images for icon matching
  const [osImages, setOsImages] = useState<OSImage[]>([])

  // Pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true)
      try {
        const response = await getTemplates()
        setTemplates(response.items || [])
      } catch (error) {
        console.error('Error fetching templates:', error)
        setTemplates([])
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  // Fetch OS images for icon matching
  useEffect(() => {
    const fetchOSImages = async () => {
      try {
        const response = await getOSImages()
        setOsImages(response.images || [])
      } catch (error) {
        console.error('Error fetching OS images:', error)
        setOsImages([])
      }
    }

    fetchOSImages()
  }, [])

  // Helper to get OS icon from image source parameter
  const getOSIcon = (template: Template): string | null => {
    const imageParam = template.parameters?.find(p => p.name === 'vm_image_source')
    const imageSource = imageParam?.default?.value

    if (!imageSource || typeof imageSource !== 'string') return null

    // Try to match with OS images from API
    const imageLower = imageSource.toLowerCase()
    const matchedImage = osImages.find((img: OSImage) =>
      imageLower.includes(img.os.toLowerCase())
    )

    return matchedImage?.icon || null
  }

  // Helper to get parameter value
  const getParamValue = (template: Template, paramName: string): string => {
    const param = template.parameters?.find(p => p.name === paramName)
    if (param?.default?.value !== undefined && param?.default?.value !== null) {
      return String(param.default.value)
    }
    return 'N/A'
  }

  // Toggle expanded rows in table view
  const toggleExpanded = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates)
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId)
    } else {
      newExpanded.add(templateId)
    }
    setExpandedTemplates(newExpanded)
  }

  // Format type name
  const formatTypeName = (type: string): string => {
    return type.replace('type.googleapis.com/google.protobuf.', '')
  }

  // Open template detail modal
  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template)
    setIsDetailModalOpen(true)
  }

  // Close template detail modal
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedTemplate(null)
  }

  // Create VM from template - open quick create modal
  const handleCreateVMFromTemplate = () => {
    setIsQuickCreateModalOpen(true)
    setVmName('')
    setVmNameValidated(ValidatedOptions.default)
    setCreateError(null)
    setCreateSuccess(false)
  }

  // Close quick create modal
  const handleCloseQuickCreateModal = () => {
    setIsQuickCreateModalOpen(false)
    setVmName('')
    setVmNameValidated(ValidatedOptions.default)
    setCreateError(null)
    setCreateSuccess(false)
  }

  // Validate VM name
  const validateVmName = (name: string): boolean => {
    if (!name || name.trim().length === 0) {
      setVmNameValidated(ValidatedOptions.error)
      setCreateError('VM name is required')
      return false
    }
    // Kubernetes naming validation (lowercase alphanumeric and hyphens, max 63 chars)
    const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
    if (!k8sNameRegex.test(name) || name.length > 63) {
      setVmNameValidated(ValidatedOptions.error)
      setCreateError('VM name must be lowercase alphanumeric with hyphens, max 63 characters')
      return false
    }
    setVmNameValidated(ValidatedOptions.success)
    setCreateError(null)
    return true
  }

  // Handle quick VM creation from template
  const handleQuickCreateVM = async () => {
    if (!selectedTemplate) return

    if (!validateVmName(vmName)) {
      return
    }

    setIsCreatingVM(true)
    setCreateError(null)

    try {
      // Extract all default parameters from the template
      const parameters: Record<string, any> = {}
      selectedTemplate.parameters?.forEach(param => {
        if (param.default?.value !== undefined && param.default?.value !== null) {
          parameters[param.name] = param.default.value
        }
      })

      // Create the VM with template ID and default parameters
      await createVirtualMachine({
        id: vmName,
        spec: {
          template: selectedTemplate.id,
          template_parameters: parameters
        }
      })

      setCreateSuccess(true)
      setTimeout(() => {
        handleCloseQuickCreateModal()
        setIsDetailModalOpen(false)
      }, 1500)
    } catch (error) {
      console.error('Failed to create VM:', error)
      if (error instanceof Error) {
        setCreateError(error.message)
      } else {
        setCreateError('Failed to create virtual machine')
      }
    } finally {
      setIsCreatingVM(false)
    }
  }

  // Edit template
  const handleEditTemplate = () => {
    if (selectedTemplate) {
      // TODO: Open edit template wizard
      alert(`Edit template: ${selectedTemplate.title}`)
    }
  }

  // Handle VM creation from wizard
  const handleCreateVM = async (vmId: string, templateId: string, parameters: Record<string, any>) => {
    await createVirtualMachine({
      id: vmId,
      spec: {
        template: templateId,
        template_parameters: parameters
      }
    })
  }

  // Filter templates based on search
  const filteredTemplates = templates.filter(template => {
    if (!searchValue.trim()) return true
    const searchLower = searchValue.toLowerCase()
    return (
      template.id.toLowerCase().includes(searchLower) ||
      template.title.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower)
    )
  })

  // Pagination
  const totalItems = filteredTemplates.length
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex)

  return (
    <AppLayout>
      <PageSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Title headingLevel="h1" size="2xl">
            Templates
          </Title>
        </div>

        <Card>
          <Toolbar style={{ padding: '1rem 1.5rem' }}>
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  placeholder="Search by name, title, or description"
                  value={searchValue}
                  onChange={(_event, value) => setSearchValue(value)}
                  onClear={() => setSearchValue('')}
                  style={{ width: '400px' }}
                />
              </ToolbarItem>
              <ToolbarItem>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <Button
                    variant={viewMode === 'cards' ? ButtonVariant.primary : ButtonVariant.control}
                    onClick={() => setViewMode('cards')}
                    aria-label="Card view"
                  >
                    <ThLargeIcon />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? ButtonVariant.primary : ButtonVariant.control}
                    onClick={() => setViewMode('table')}
                    aria-label="Table view"
                  >
                    <ThIcon />
                  </Button>
                </div>
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
                <p style={{ marginTop: '1rem', color: '#6a6e73' }}>Loading templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <EmptyState>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {templates.length === 0 ? <CubeIcon /> : <SearchIcon />}
                </div>
                <Title headingLevel="h4" size="lg">
                  {templates.length === 0 ? "No templates" : "No results found"}
                </Title>
                <EmptyStateBody>
                  {templates.length === 0
                    ? "There are no templates to display."
                    : "No templates match your search criteria. Try adjusting your filters."}
                </EmptyStateBody>
              </EmptyState>
            ) : viewMode === 'cards' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(342px, 1fr))',
                gap: '1rem',
                width: '100%',
                maxWidth: '100%'
              }}>
                {paginatedTemplates.map((template) => {
                  const osIcon = getOSIcon(template)
                  const cpuCores = getParamValue(template, 'vm_cpu_cores')
                  const memory = getParamValue(template, 'vm_memory_size')
                  const diskSize = getParamValue(template, 'vm_disk_size')

                  return (
                    <Card
                      key={template.id}
                      style={{
                        height: '325px',
                        maxWidth: '450px',
                        border: '1px solid #d2d2d2',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      onClick={() => handleTemplateClick(template)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      {/* Header with logo and title */}
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: '#fafafa',
                        flexShrink: 0,
                        minHeight: '80px'
                      }}>
                        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                          <FlexItem>
                            {osIcon ? (
                              <img
                                src={osIcon}
                                alt="OS icon"
                                style={{
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '8px',
                                  padding: '4px',
                                  backgroundColor: '#f8f8f8',
                                  objectFit: 'contain'
                                }}
                                onError={(e) => {
                                  const target = e.currentTarget
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div style="
                                        width: 64px;
                                        height: 64px;
                                        background-color: #06c;
                                        border-radius: 8px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        color: white;
                                        font-size: 32px;
                                      ">
                                        <svg fill="currentColor" height="1em" width="1em" viewBox="0 0 512 512" aria-hidden="true" role="img" style="vertical-align: -0.125em;"><path d="M234.5 5.7c13.9-5 29.1-5 43.1 0l192 68.6C495 83.4 512 107.5 512 134.6V377.4c0 27-17 51.2-42.5 60.3l-192 68.6c-13.9 5-29.1 5-43.1 0l-192-68.6C17 428.6 0 404.5 0 377.4V134.6c0-27 17-51.2 42.5-60.3l192-68.6zM256 66L82.3 128 256 190l173.7-62L256 66zm32 368.6l160-57.1v-188L288 246.6v188z"></path></svg>
                                      </div>
                                    `
                                  }
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '64px',
                                height: '64px',
                                backgroundColor: '#06c',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '32px'
                              }}>
                                <CubeIcon />
                              </div>
                            )}
                          </FlexItem>
                          <FlexItem flex={{ default: 'flex_1' }} style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: '19px',
                              fontWeight: '600',
                              color: '#151515',
                              lineHeight: '1.2',
                              marginBottom: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {template.title}
                            </div>
                            <div style={{
                              fontSize: '14px',
                              color: '#6a6e73',
                              fontWeight: '400',
                              lineHeight: '1.2',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {template.id}
                            </div>
                          </FlexItem>
                        </Flex>
                      </div>

                      <CardBody style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '1.5rem',
                        overflow: 'hidden'
                      }}>
                        {/* Description */}
                        <div style={{
                          fontSize: '14px',
                          color: '#6a6e73',
                          lineHeight: '1.5',
                          marginBottom: 'auto',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          minHeight: '63px'
                        }}>
                          {template.description || 'No description provided'}
                        </div>

                        {/* Separator line */}
                        <div style={{
                          borderTop: '1px solid #d2d2d2',
                          marginTop: '1.5rem',
                          marginBottom: '0.75rem',
                          marginLeft: '-1.5rem',
                          marginRight: '-1.5rem'
                        }} />

                        {/* Hardware specs at bottom */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          minHeight: '100px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <div style={{ fontSize: '3rem', color: '#06c', lineHeight: '1' }}>
                              <CpuIcon />
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#151515' }}>
                              {cpuCores}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#6a6e73', paddingTop: '0.25rem' }}>
                              vCPU Cores
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <div style={{ fontSize: '3rem', color: '#06c', lineHeight: '1' }}>
                              <MemoryIcon />
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#151515' }}>
                              {memory}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#6a6e73', paddingTop: '0.25rem' }}>
                              Memory
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <div style={{ fontSize: '3rem', color: '#06c', lineHeight: '1' }}>
                              <DatabaseIcon />
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#151515' }}>
                              {diskSize}
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
            ) : (
              <Table aria-label="Templates Table" variant="compact">
                <Thead>
                  <Tr>
                    <Th></Th>
                    <Th>ID</Th>
                    <Th>Title</Th>
                    <Th>Description</Th>
                    <Th>CPU</Th>
                    <Th>Memory</Th>
                    <Th>Disk</Th>
                    <Th>Parameters</Th>
                  </Tr>
                </Thead>
                {paginatedTemplates.map((template, rowIndex) => {
                  const cpuCores = getParamValue(template, 'vm_cpu_cores')
                  const memory = getParamValue(template, 'vm_memory_size')
                  const diskSize = getParamValue(template, 'vm_disk_size')

                  return (
                    <Tbody key={template.id} isExpanded={expandedTemplates.has(template.id)}>
                      <Tr>
                        <Td
                          expand={template.parameters && template.parameters.length > 0 ? {
                            rowIndex,
                            isExpanded: expandedTemplates.has(template.id),
                            onToggle: () => toggleExpanded(template.id),
                          } : undefined}
                        />
                        <Td dataLabel="ID"><code style={{ fontSize: '0.9rem' }}>{template.id}</code></Td>
                        <Td dataLabel="Title">{template.title}</Td>
                        <Td dataLabel="Description" style={{ maxWidth: '300px' }}>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {template.description || 'N/A'}
                          </div>
                        </Td>
                        <Td dataLabel="CPU">{cpuCores}</Td>
                        <Td dataLabel="Memory">{memory}</Td>
                        <Td dataLabel="Disk">{diskSize}</Td>
                        <Td dataLabel="Parameters">{template.parameters?.length || 0}</Td>
                      </Tr>
                      {template.parameters && template.parameters.length > 0 && (
                        <Tr isExpanded={expandedTemplates.has(template.id)}>
                          <Td colSpan={8}>
                            <ExpandableRowContent>
                              <div style={{ padding: '1rem' }}>
                                <Title headingLevel="h5" size="md" style={{ marginBottom: '0.5rem' }}>
                                  Parameters
                                </Title>
                                <Table variant="compact" borders={true}>
                                  <Thead>
                                    <Tr>
                                      <Th>Name</Th>
                                      <Th>Title</Th>
                                      <Th>Description</Th>
                                      <Th>Type</Th>
                                      <Th>Default</Th>
                                      <Th>Required</Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {template.parameters.map((param) => {
                                      const defaultValue = param.default?.value !== undefined && param.default?.value !== null
                                        ? (param.default.value === '' ? '(empty string)' : String(param.default.value))
                                        : '-'

                                      return (
                                        <Tr key={param.name}>
                                          <Td><code style={{ fontSize: '0.9rem' }}>{param.name}</code></Td>
                                          <Td>{param.title || '-'}</Td>
                                          <Td>{param.description || '-'}</Td>
                                          <Td>{formatTypeName(param.type || 'StringValue')}</Td>
                                          <Td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{defaultValue}</Td>
                                          <Td>{param.required ? 'Yes' : 'No'}</Td>
                                        </Tr>
                                      )
                                    })}
                                  </Tbody>
                                </Table>
                              </div>
                            </ExpandableRowContent>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  )
                })}
              </Table>
            )}
          </CardBody>

          {filteredTemplates.length > 0 && (
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

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <Modal
          variant={ModalVariant.large}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          aria-label="Template details"
        >
          <ModalHeader title={selectedTemplate.title} />
          <ModalBody>
            <DescriptionList isHorizontal isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>Template ID</DescriptionListTerm>
                <DescriptionListDescription>
                  <code>{selectedTemplate.id}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              {selectedTemplate.description && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Description</DescriptionListTerm>
                  <DescriptionListDescription>{selectedTemplate.description}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>CPU Cores</DescriptionListTerm>
                <DescriptionListDescription>{getParamValue(selectedTemplate, 'vm_cpu_cores')}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Memory</DescriptionListTerm>
                <DescriptionListDescription>{getParamValue(selectedTemplate, 'vm_memory_size')}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Disk Size</DescriptionListTerm>
                <DescriptionListDescription>{getParamValue(selectedTemplate, 'vm_disk_size')}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Run Strategy</DescriptionListTerm>
                <DescriptionListDescription>{getParamValue(selectedTemplate, 'vm_run_strategy')}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>OS Type</DescriptionListTerm>
                <DescriptionListDescription>{getParamValue(selectedTemplate, 'vm_os_type')}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Network Type</DescriptionListTerm>
                <DescriptionListDescription>{getParamValue(selectedTemplate, 'vm_network_type')}</DescriptionListDescription>
              </DescriptionListGroup>
              {selectedTemplate.metadata?.creation_timestamp && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {new Date(selectedTemplate.metadata.creation_timestamp).toLocaleString()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </DescriptionList>

            {selectedTemplate.parameters && selectedTemplate.parameters.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <ExpandableSection
                  toggleText={`Parameters (${selectedTemplate.parameters.length})`}
                  isExpanded={isParametersExpanded}
                  onToggle={(_event, isExpanded) => setIsParametersExpanded(isExpanded)}
                  displaySize="lg"
                >
                  <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                    <Table variant="compact" borders={false} style={{ fontSize: '0.9rem' }}>
                      <Thead>
                        <Tr style={{ backgroundColor: '#f5f5f5' }}>
                          <Th style={{ fontWeight: 600, color: '#151515', padding: '0.75rem' }}>Name</Th>
                          <Th style={{ fontWeight: 600, color: '#151515', padding: '0.75rem' }}>Title</Th>
                          <Th style={{ fontWeight: 600, color: '#151515', padding: '0.75rem' }}>Description</Th>
                          <Th style={{ fontWeight: 600, color: '#151515', padding: '0.75rem' }}>Type</Th>
                          <Th style={{ fontWeight: 600, color: '#151515', padding: '0.75rem' }}>Default</Th>
                          <Th style={{ fontWeight: 600, color: '#151515', padding: '0.75rem' }}>Required</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedTemplate.parameters.map((param, index) => {
                          const defaultValue = param.default?.value !== undefined && param.default?.value !== null
                            ? (param.default.value === '' ? '(empty string)' : String(param.default.value))
                            : '-'

                          return (
                            <Tr
                              key={param.name}
                              style={{
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                borderBottom: '1px solid #f0f0f0'
                              }}
                            >
                              <Td style={{ padding: '0.75rem' }}>
                                <code style={{
                                  fontSize: '0.85rem',
                                  backgroundColor: '#f0f0f0',
                                  padding: '0.125rem 0.25rem',
                                  borderRadius: '3px',
                                  color: '#06c'
                                }}>
                                  {param.name}
                                </code>
                              </Td>
                              <Td style={{ padding: '0.75rem', fontWeight: 500, color: '#151515' }}>
                                {param.title || '-'}
                              </Td>
                              <Td style={{ padding: '0.75rem', color: '#6a6e73', maxWidth: '300px' }}>
                                {param.description || '-'}
                              </Td>
                              <Td style={{ padding: '0.75rem' }}>
                                <span style={{
                                  padding: '0.125rem 0.5rem',
                                  backgroundColor: '#e7f1fa',
                                  borderRadius: '12px',
                                  fontSize: '0.8rem',
                                  color: '#004080',
                                  fontWeight: 500
                                }}>
                                  {formatTypeName(param.type || 'StringValue')}
                                </span>
                              </Td>
                              <Td style={{
                                padding: '0.75rem',
                                fontFamily: 'monospace',
                                fontSize: '0.8rem',
                                color: '#151515'
                              }}>
                                {defaultValue}
                              </Td>
                              <Td style={{ padding: '0.75rem' }}>
                                {param.required ? (
                                  <span style={{
                                    color: '#c9190b',
                                    fontWeight: 600,
                                    fontSize: '0.85rem'
                                  }}>
                                    Yes
                                  </span>
                                ) : (
                                  <span style={{ color: '#6a6e73', fontSize: '0.85rem' }}>No</span>
                                )}
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  </div>
                </ExpandableSection>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              icon={<RocketIcon />}
              onClick={handleCreateVMFromTemplate}
            >
              Create VM
            </Button>
            <Button
              variant="secondary"
              icon={<EditIcon />}
              onClick={handleEditTemplate}
              isDisabled
            >
              Edit Template
            </Button>
            <Button variant="link" onClick={handleCloseDetailModal}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Quick Create VM from Template Modal */}
      {selectedTemplate && (
        <Modal
          variant={ModalVariant.small}
          isOpen={isQuickCreateModalOpen}
          onClose={handleCloseQuickCreateModal}
          aria-label="Quick create virtual machine"
        >
          <ModalHeader title={`Create VM from ${selectedTemplate.title}`} />
          <ModalBody>
            {createSuccess ? (
              <Alert variant="success" isInline title="Success">
                Virtual machine created successfully!
              </Alert>
            ) : (
              <>
                {createError && (
                  <Alert variant="danger" isInline title="Error" style={{ marginBottom: '1rem' }}>
                    {createError}
                  </Alert>
                )}
                <Form>
                  <FormGroup label="Virtual Machine Name" isRequired fieldId="vm-name">
                    <TextInput
                      isRequired
                      type="text"
                      id="vm-name"
                      name="vm-name"
                      value={vmName}
                      onChange={(_event, value) => {
                        setVmName(value)
                        if (vmNameValidated !== ValidatedOptions.default) {
                          setVmNameValidated(ValidatedOptions.default)
                          setCreateError(null)
                        }
                      }}
                      validated={vmNameValidated}
                      placeholder="my-virtual-machine"
                      isDisabled={isCreatingVM}
                    />
                    {vmNameValidated === ValidatedOptions.default && (
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                        Lowercase alphanumeric with hyphens (e.g., my-vm-01)
                      </div>
                    )}
                  </FormGroup>
                </Form>
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginBottom: '0.5rem' }}>
                    <strong>Template Configuration:</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    • Template: <strong>{selectedTemplate.id}</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    • CPU: <strong>{getParamValue(selectedTemplate, 'vm_cpu_cores')} cores</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    • Memory: <strong>{getParamValue(selectedTemplate, 'vm_memory_size')}</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    • Disk: <strong>{getParamValue(selectedTemplate, 'vm_disk_size')}</strong>
                  </div>
                </div>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            {!createSuccess && (
              <>
                <Button
                  variant="primary"
                  onClick={handleQuickCreateVM}
                  isDisabled={isCreatingVM || !vmName}
                  isLoading={isCreatingVM}
                >
                  {isCreatingVM ? 'Creating...' : 'Create'}
                </Button>
                <Button variant="link" onClick={handleCloseQuickCreateModal} isDisabled={isCreatingVM}>
                  Cancel
                </Button>
              </>
            )}
            {createSuccess && (
              <Button variant="primary" onClick={handleCloseQuickCreateModal}>
                Close
              </Button>
            )}
          </ModalFooter>
        </Modal>
      )}

      {/* Create VM Wizard */}
      <CreateVMWizard
        isOpen={isCreateVMWizardOpen}
        onClose={() => setIsCreateVMWizardOpen(false)}
        onCreate={handleCreateVM}
        templates={templates}
      />
    </AppLayout>
  )
}

export default Templates
