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
} from '@patternfly/react-core'
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ExpandableRowContent,
} from '@patternfly/react-table'
import { CubeIcon, SearchIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getTemplates } from '../api/templates'
import { Template } from '../api/types'

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())

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
                    </Tr>
                    <Tr isExpanded={expandedTemplates.has(template.id)}>
                      <Td colSpan={6}>
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
    </AppLayout>
  )
}

export default Templates
