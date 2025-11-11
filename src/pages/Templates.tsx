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
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  AlertVariant,
} from '@patternfly/react-core'
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ExpandableRowContent,
  ActionsColumn,
} from '@patternfly/react-table'
import { CubeIcon, SearchIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getTemplates, deleteTemplate } from '../api/templates'
import { Template } from '../api/types'

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Sorting
  const [activeSortIndex, setActiveSortIndex] = useState<number | undefined>(undefined)
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

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

  const toggleExpanded = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates)
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId)
    } else {
      newExpanded.add(templateId)
    }
    setExpandedTemplates(newExpanded)
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A'
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  // Delete handlers
  const openDeleteModal = (template: Template) => {
    setTemplateToDelete(template)
    setDeleteError(null)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false)
      setTemplateToDelete(null)
      setDeleteError(null)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteTemplate(templateToDelete.id)

      // Remove template from state
      setTemplates(templates.filter(t => t.id !== templateToDelete.id))

      // Close modal
      setIsDeleteModalOpen(false)
      setTemplateToDelete(null)
    } catch (error) {
      console.error('Failed to delete template:', error)
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete template')
    } finally {
      setIsDeleting(false)
    }
  }

  // Sorting logic
  const getSortableValue = (template: Template, columnIndex: number): string => {
    switch (columnIndex) {
      case 0: return template.id
      case 1: return template.title
      case 2: return template.description || ''
      case 3: return (template.parameters?.length || 0).toString()
      case 4: return template.metadata?.creation_timestamp || ''
      default: return ''
    }
  }

  const onSort = (_event: any, index: number, direction: 'asc' | 'desc') => {
    setActiveSortIndex(index)
    setActiveSortDirection(direction)
  }

  // Filter and sort
  let filteredTemplates = templates.filter(template => {
    if (!searchValue) return true
    const searchLower = searchValue.toLowerCase()
    return (
      template.id.toLowerCase().includes(searchLower) ||
      template.title.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower)
    )
  })

  if (activeSortIndex !== undefined) {
    filteredTemplates = [...filteredTemplates].sort((a, b) => {
      const aValue = getSortableValue(a, activeSortIndex)
      const bValue = getSortableValue(b, activeSortIndex)
      if (activeSortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      }
      return bValue.localeCompare(aValue)
    })
  }

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
            ) : (
              <Table aria-label="Templates Table" variant="compact">
                <Thead>
                  <Tr>
                    <Th></Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 0 }}>
                      ID
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 1 }}>
                      Title
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 2 }}>
                      Description
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 3 }}>
                      Parameters
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 4 }}>
                      Created
                    </Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                {paginatedTemplates.map((template, rowIndex) => (
                  <Tbody key={template.id} isExpanded={expandedTemplates.has(template.id)}>
                    <Tr>
                      <Td
                        expand={{
                          rowIndex,
                          isExpanded: expandedTemplates.has(template.id),
                          onToggle: () => toggleExpanded(template.id),
                        }}
                      />
                      <Td dataLabel="ID">{template.id}</Td>
                      <Td dataLabel="Title">{template.title}</Td>
                      <Td dataLabel="Description">{template.description || 'N/A'}</Td>
                      <Td dataLabel="Parameters">{template.parameters?.length || 0}</Td>
                      <Td dataLabel="Created">{formatTimestamp(template.metadata?.creation_timestamp)}</Td>
                      <Td isActionCell>
                        <ActionsColumn
                          items={[
                            {
                              title: 'Delete',
                              onClick: () => openDeleteModal(template)
                            }
                          ]}
                        />
                      </Td>
                    </Tr>
                    <Tr isExpanded={expandedTemplates.has(template.id)}>
                      <Td colSpan={7}>
                        <ExpandableRowContent>
                          <div style={{ padding: '1rem' }}>
                            {/* Template metadata */}
                            {template.metadata?.creators && template.metadata.creators.length > 0 && (
                              <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <strong>Created by:</strong> {template.metadata.creators.join(', ')}
                              </div>
                            )}

                            {/* Parameters table */}
                            {template.parameters && template.parameters.length > 0 ? (
                              <>
                                <Title headingLevel="h5" size="md" style={{ marginBottom: '0.5rem' }}>
                                  Parameters
                                </Title>
                                <Table variant="compact" borders={true}>
                                  <Thead>
                                    <Tr>
                                      <Th>Name</Th>
                                      <Th>Description</Th>
                                      <Th>Type</Th>
                                      <Th>Default</Th>
                                      <Th>Required</Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {template.parameters.map((param) => {
                                      // Extract type from default's @type field or use param.type
                                      const paramType = param.default?.['@type']
                                        ? param.default['@type'].replace('type.googleapis.com/google.protobuf.', '')
                                        : (param.type ? param.type.replace('type.googleapis.com/google.protobuf.', '') : 'string')

                                      // Get default value, handling empty strings properly
                                      const defaultValue = param.default?.value !== undefined && param.default?.value !== null
                                        ? (param.default.value === '' ? '(empty string)' : String(param.default.value))
                                        : '-'

                                      return (
                                        <Tr key={param.name}>
                                          <Td><code style={{ fontSize: '0.9rem' }}>{param.name}</code></Td>
                                          <Td>{param.description || '-'}</Td>
                                          <Td>{paramType}</Td>
                                          <Td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{defaultValue}</Td>
                                          <Td>{param.required ? 'Yes' : 'No'}</Td>
                                        </Tr>
                                      )
                                    })}
                                  </Tbody>
                                </Table>
                              </>
                            ) : (
                              <div>No parameters defined for this template</div>
                            )}
                          </div>
                        </ExpandableRowContent>
                      </Td>
                    </Tr>
                  </Tbody>
                ))}
              </Table>
            )}
          </CardBody>

          {filteredTemplates.length > 0 && (
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

      {/* Delete confirmation modal */}
      <Modal
        variant={ModalVariant.small}
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        aria-label="Delete template confirmation"
      >
        <ModalHeader title="Delete template" />
        <ModalBody>
          {deleteError && (
            <Alert variant={AlertVariant.danger} isInline title="Error" style={{ marginBottom: '1rem' }}>
              {deleteError}
            </Alert>
          )}
          <p>Are you sure you want to delete template <strong>{templateToDelete?.title}</strong>?</p>
          <p style={{ marginTop: '0.5rem', color: '#6a6e73' }}>
            ID: <code>{templateToDelete?.id}</code>
          </p>
          <p style={{ marginTop: '1rem', color: '#c9190b' }}>This action cannot be undone.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleDeleteTemplate} isDisabled={isDeleting} isLoading={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
          <Button variant="link" onClick={closeDeleteModal} isDisabled={isDeleting}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  )
}

export default Templates
