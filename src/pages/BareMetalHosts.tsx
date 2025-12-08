import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
import { useTranslation } from 'react-i18next'
import AppLayout from '../components/layouts/AppLayout'
import { getHosts } from '../api/hosts'
import { Host, Cluster } from '../api/types'
import { listClusters } from '../api/clustersApi'
import { logger } from '@/utils/logger'

const BareMetalHosts: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation(['bareMetalHosts'])
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [clusterNames, setClusterNames] = useState<Map<string, string>>(new Map())

  // Sorting
  const [activeSortIndex, setActiveSortIndex] = useState<number | undefined>(undefined)
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    const fetchData = async () => {
      if (isInitialLoad) {
        setLoading(true)
      }
      try {
        const [hostsResponse, clustersResponse] = await Promise.all([
          getHosts(),
          listClusters().catch(() => ({ items: [], total: 0, size: 0 })) // Gracefully handle cluster fetch failure
        ])

        setHosts(hostsResponse.items || [])

        // Create a map of cluster IDs to names
        const nameMap = new Map<string, string>()
        clustersResponse.items?.forEach((cluster: Cluster) => {
          if (cluster.id && cluster.metadata?.name) {
            nameMap.set(cluster.id, cluster.metadata.name)
          }
        })
        setClusterNames(nameMap)
      } catch (error) {
        logger.error('Error fetching hosts', error)
        setHosts([])
      } finally {
        if (isInitialLoad) {
          setLoading(false)
          setIsInitialLoad(false)
        }
      }
    }

    fetchData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [isInitialLoad])

  const getPowerStateBadge = (powerState?: string) => {
    if (!powerState) return <Label color="grey">{t('bareMetalHosts:powerState.unknown')}</Label>

    const normalizedState = powerState.toUpperCase()

    if (normalizedState.includes('ON') || normalizedState.includes('RUNNING')) {
      return <Label color="green">{t('bareMetalHosts:powerState.on')}</Label>
    } else if (normalizedState.includes('OFF')) {
      return <Label color="red">{t('bareMetalHosts:powerState.off')}</Label>
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
    navigate(`/bare-metal-hosts/${host.id}`)
  }

  // Sorting logic
  const getSortableValue = (host: Host, columnIndex: number): string => {
    switch (columnIndex) {
      case 0: return host.metadata?.name || host.id
      case 1: return host.status?.power_state || ''
      case 2: return host.spec?.rack || ''
      case 3: return host.spec?.boot_ip || ''
      case 4: return host.status?.cluster || ''
      case 5: return host.metadata?.creation_timestamp || ''
      default: return ''
    }
  }

  const onSort = (_event: React.SyntheticEvent, index: number, direction: 'asc' | 'desc') => {
    setActiveSortIndex(index)
    setActiveSortDirection(direction)
  }

  // Filter and sort
  let filteredHosts = hosts.filter(host => {
    if (!searchValue) return true
    const searchLower = searchValue.toLowerCase()
    return (
      host.metadata?.name?.toLowerCase().includes(searchLower) ||
      host.id.toLowerCase().includes(searchLower) ||
      host.status?.host_pool?.toLowerCase().includes(searchLower) ||
      host.status?.power_state?.toLowerCase().includes(searchLower) ||
      host.spec?.rack?.toLowerCase().includes(searchLower) ||
      host.spec?.boot_ip?.toLowerCase().includes(searchLower)
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
            {t('bareMetalHosts:title')}
          </Title>
        </div>

        <Card>
          <Toolbar style={{ padding: '1rem 1.5rem' }}>
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  placeholder={t('bareMetalHosts:search.placeholder')}
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
                <p style={{ marginTop: '1rem', color: '#6a6e73' }}>{t('bareMetalHosts:loading')}</p>
              </div>
            ) : filteredHosts.length === 0 ? (
              <EmptyState>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {hosts.length === 0 ? <ServerIcon /> : <SearchIcon />}
                </div>
                <Title headingLevel="h4" size="lg">
                  {hosts.length === 0 ? t('bareMetalHosts:empty.noHosts') : t('bareMetalHosts:empty.noResults')}
                </Title>
                <EmptyStateBody>
                  {hosts.length === 0
                    ? t('bareMetalHosts:empty.noHostsDescription')
                    : t('bareMetalHosts:empty.noResultsDescription')}
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <Table aria-label="Bare Metal Hosts Table" variant="compact">
                <Thead>
                  <Tr>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 0 }}>
                      {t('bareMetalHosts:columns.name')}
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 1 }}>
                      {t('bareMetalHosts:columns.powerState')}
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 2 }}>
                      {t('bareMetalHosts:columns.rack')}
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 3 }}>
                      {t('bareMetalHosts:columns.bootIP')}
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 4 }}>
                      {t('bareMetalHosts:columns.cluster')}
                    </Th>
                    <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 5 }}>
                      {t('bareMetalHosts:columns.created')}
                    </Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedHosts.map((host) => (
                    <Tr key={host.id} style={{ cursor: 'pointer', height: '55px' }}>
                      <Td dataLabel="Name" onClick={() => handleRowClick(host)}>{host.metadata?.name || host.id}</Td>
                      <Td dataLabel="Power State" onClick={() => handleRowClick(host)}>{getPowerStateBadge(host.status?.power_state)}</Td>
                      <Td dataLabel="Rack" onClick={() => handleRowClick(host)}>{host.spec?.rack || 'N/A'}</Td>
                      <Td dataLabel="Boot IP" onClick={() => handleRowClick(host)}>{host.spec?.boot_ip || 'N/A'}</Td>
                      <Td dataLabel="Cluster">
                        {host.status?.cluster ? (
                          <Link
                            to={`/admin/clusters/${host.status.cluster}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: '#06c', textDecoration: 'none' }}
                          >
                            {clusterNames.get(host.status.cluster) || host.status.cluster.substring(0, 8) + '...'}
                          </Link>
                        ) : 'N/A'}
                      </Td>
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
                              {t('bareMetalHosts:actions.viewDetails')}
                            </DropdownItem>
                            <DropdownItem key="power">
                              {t('bareMetalHosts:actions.powerOptions')}
                            </DropdownItem>
                            {host.spec?.bcm_link && (
                              <DropdownItem key="bcm" onClick={() => window.open(host.spec?.bcm_link, '_blank')}>
                                {t('bareMetalHosts:actions.openBcmLink')}
                              </DropdownItem>
                            )}
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
