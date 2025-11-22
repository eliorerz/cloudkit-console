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
  Label,
  Pagination,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core'
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table'
import { ServerIcon, SearchIcon, EllipsisVIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getHosts } from '../api/hosts'
import { Host } from '../api/types'

const BareMetalHosts: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)

  // Sorting
  const [activeSortIndex, setActiveSortIndex] = useState<number | undefined>(undefined)
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    const fetchHosts = async () => {
      if (isInitialLoad) {
        setLoading(true)
      }
      try {
        const response = await getHosts()
        setHosts(response.items || [])
      } catch (error) {
        console.error('Error fetching hosts:', error)
        setHosts([])
      } finally {
        if (isInitialLoad) {
          setLoading(false)
          setIsInitialLoad(false)
        }
      }
    }

    fetchHosts()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHosts, 30000)
    return () => clearInterval(interval)
  }, [isInitialLoad])

  const getStateBadge = (state?: string) => {
    if (!state) return <Label color="grey">Unknown</Label>

    const normalizedState = state.toUpperCase()

    if (normalizedState.includes('READY') || normalizedState.includes('AVAILABLE')) {
      return <Label color="green">Ready</Label>
    } else if (normalizedState.includes('PROGRESSING') || normalizedState.includes('PROVISIONING')) {
      return <Label color="blue">Progressing</Label>
    } else if (normalizedState.includes('FAILED') || normalizedState.includes('ERROR')) {
      return <Label color="red">Failed</Label>
    } else if (normalizedState.includes('MAINTENANCE')) {
      return <Label color="orange">Maintenance</Label>
    }

    return <Label color="grey">{state}</Label>
  }

  const getPowerStateBadge = (powerState?: string) => {
    if (!powerState) return <Label color="grey">Unknown</Label>

    const normalizedState = powerState.toUpperCase()

    if (normalizedState.includes('ON') || normalizedState.includes('RUNNING')) {
      return <Label color="green">On</Label>
    } else if (normalizedState.includes('OFF')) {
      return <Label color="grey">Off</Label>
    }

    return <Label color="grey">{powerState}</Label>
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A'
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  const handleRowClick = (host: Host) => {
    // Future: navigate to host detail page
    // navigate(`/bare-metal-hosts/${host.id}`)
    console.log('Host clicked:', host.id)
  }

  // Sorting logic
  const getSortableValue = (host: Host, columnIndex: number): string => {
    switch (columnIndex) {
      case 0: return host.id
      case 1: return host.status?.state || ''
      case 2: return host.status?.power_state || ''
      case 3: return host.status?.host_pool || ''
      case 4: return host.metadata?.creation_timestamp || ''
      default: return ''
    }
  }

  const onSort = (_event: any, index: number, direction: 'asc' | 'desc') => {
    setActiveSortIndex(index)
    setActiveSortDirection(direction)
  }

  // Filter and sort
  let filteredHosts = hosts.filter(host => {
    if (!searchValue) return true
    const searchLower = searchValue.toLowerCase()
    return (
      host.id.toLowerCase().includes(searchLower) ||
      host.status?.host_pool?.toLowerCase().includes(searchLower) ||
      host.status?.state?.toLowerCase().includes(searchLower) ||
      host.status?.power_state?.toLowerCase().includes(searchLower)
    )
  })

  if (activeSortIndex !== undefined) {
    filteredHosts = [...filteredHosts].sort((a, b) => {
      const aValue = getSortableValue(a, activeSortIndex)
      const bValue = getSortableValue(b, activeSortIndex)
      if (activeSortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      }
      return bValue.localeCompare(aValue)
    })
  }

  // Pagination
  const totalItems = filteredHosts.length
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedHosts = filteredHosts.slice(startIndex, endIndex)

  return (
    <AppLayout>
      <PageSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Title headingLevel="h1" size="2xl">
            Bare Metal Hosts
          </Title>
        </div>

        <Card>
          <Toolbar style={{ padding: '1rem 1.5rem' }}>
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  placeholder="Search by ID, state, or host pool"
                  value={searchValue}
                  onChange={(_event, value) => setSearchValue(value)}
                  onClear={() => setSearchValue('')}
                  style={{ width: '400px' }}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>

          <CardBody>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="xl" />
                <p style={{ marginTop: '1rem', color: '#6a6e73' }}>Loading bare metal hosts...</p>
              </div>
            ) : filteredHosts.length === 0 ? (
              <EmptyState>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {hosts.length === 0 ? <ServerIcon /> : <SearchIcon />}
                </div>
                <Title headingLevel="h4" size="lg">
                  {hosts.length === 0 ? "No bare metal hosts" : "No results found"}
                </Title>
                <EmptyStateBody>
                  {hosts.length === 0
                    ? "There are no bare metal hosts to display."
                    : "No hosts match your search criteria. Try adjusting your filters."}
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <Table aria-label="Bare Metal Hosts Table" variant="compact">
                <Thead>
                  <Tr>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 0 }}>
                      ID
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 1 }}>
                      State
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 2 }}>
                      Power State
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 3 }}>
                      Host Pool
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 4 }}>
                      Created
                    </Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedHosts.map((host) => (
                    <Tr key={host.id} style={{ cursor: 'pointer' }}>
                      <Td dataLabel="ID" onClick={() => handleRowClick(host)}>{host.id}</Td>
                      <Td dataLabel="State" onClick={() => handleRowClick(host)}>{getStateBadge(host.status?.state)}</Td>
                      <Td dataLabel="Power State" onClick={() => handleRowClick(host)}>{getPowerStateBadge(host.status?.power_state)}</Td>
                      <Td dataLabel="Host Pool" onClick={() => handleRowClick(host)}>{host.status?.host_pool || 'N/A'}</Td>
                      <Td dataLabel="Created" onClick={() => handleRowClick(host)}>{formatTimestamp(host.metadata?.creation_timestamp)}</Td>
                      <Td isActionCell>
                        <Dropdown
                          isOpen={openActionMenuId === host.id}
                          onSelect={() => setOpenActionMenuId(null)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              onClick={() => setOpenActionMenuId(openActionMenuId === host.id ? null : host.id)}
                              variant="plain"
                            >
                              <EllipsisVIcon />
                            </MenuToggle>
                          )}
                        >
                          <DropdownList>
                            <DropdownItem key="details">
                              View Details
                            </DropdownItem>
                            <DropdownItem key="power">
                              Power Options
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

          {filteredHosts.length > 0 && (
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
    </AppLayout>
  )
}

export default BareMetalHosts
