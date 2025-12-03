import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PageSection,
  Title,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Spinner,
  Label,
  Pagination,
  Alert,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  Card,
  CardBody,
  Badge,
} from '@patternfly/react-core'
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table'
import { CubesIcon, EllipsisVIcon, FilterIcon } from '@patternfly/react-icons'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layouts/AppLayout'
import { listClusters } from '../api/clustersApi'
import { Cluster, ClusterState } from '../api/types'

const Clusters: React.FC = () => {
  const { t } = useTranslation(['clusters', 'common'])
  const navigate = useNavigate()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)

  // Search and filter state
  const [searchValue, setSearchValue] = useState('')
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const [isVersionFilterOpen, setIsVersionFilterOpen] = useState(false)

  // Sorting state
  const [activeSortIndex, setActiveSortIndex] = useState<number | undefined>(undefined)
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination state
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    loadClusters()
    // Poll every 10s for status updates
    const interval = setInterval(loadClusters, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadClusters = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await listClusters()
      setClusters(response.items || [])
    } catch (err: any) {
      console.error('Failed to load clusters:', err)
      setError(err.message || 'Failed to load clusters')
    } finally {
      setLoading(false)
    }
  }

  const getStateBadgeColor = (state?: ClusterState) => {
    switch (state) {
      case ClusterState.READY:
        return 'green'
      case ClusterState.PROGRESSING:
        return 'blue'
      case ClusterState.FAILED:
        return 'red'
      default:
        return 'grey'
    }
  }

  const formatState = (state?: ClusterState) => {
    if (!state) return t('common:status.unknown')
    const normalizedState = state.toUpperCase()
    if (normalizedState.includes('READY')) {
      return t('common:status.ready')
    } else if (normalizedState.includes('PROGRESSING')) {
      return t('common:status.pending')
    } else if (normalizedState.includes('FAILED')) {
      return t('common:status.failed')
    }
    // Fallback: Remove CLUSTER_STATE_ prefix and capitalize first letter only
    const cleaned = state.replace('CLUSTER_STATE_', '')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
  }

  const getVersion = (cluster: Cluster): string => {
    const params = cluster.spec?.template_parameters
    if (!params) return '-'

    // Try common parameter names for version
    return params.ocp_version || params.openshift_version || params.version || params.cluster_version || '4.20.4'
  }

  const getHostsCount = (cluster: Cluster): number => {
    const nodeSets = cluster.status?.node_sets || cluster.spec?.node_sets
    if (!nodeSets) return 0

    return Object.values(nodeSets).reduce((total, nodeSet) => {
      return total + (nodeSet.size || 0)
    }, 0)
  }

  // Get unique versions from clusters
  const versionOptions = useMemo(() => {
    const versions = new Set<string>()
    clusters.forEach(cluster => {
      const version = getVersion(cluster)
      if (version && version !== '-') {
        versions.add(version)
      }
    })
    return Array.from(versions).sort()
  }, [clusters])

  // Get unique states from clusters
  const stateOptions = useMemo(() => {
    const states = new Set<string>()
    clusters.forEach(cluster => {
      const state = cluster.status?.state
      if (state) {
        const formatted = formatState(state)
        states.add(formatted)
      }
    })
    return Array.from(states).sort()
  }, [clusters])

  // Sorting logic
  const getSortableValue = (cluster: Cluster, columnIndex: number): string => {
    switch (columnIndex) {
      case 0: return cluster.metadata?.name || cluster.id
      case 1: return getVersion(cluster)
      case 2: return formatState(cluster.status?.state)
      case 3: return String(getHostsCount(cluster))
      case 4: return cluster.metadata?.creation_timestamp || ''
      default: return ''
    }
  }

  const onSort = (_event: any, index: number, direction: 'asc' | 'desc') => {
    setActiveSortIndex(index)
    setActiveSortDirection(direction)
  }

  // Filter and sort clusters
  let filteredClusters = clusters.filter(cluster => {
    // Filter by version
    if (selectedVersions.length > 0) {
      const version = getVersion(cluster)
      if (!selectedVersions.includes(version)) return false
    }

    // Filter by state
    if (selectedStates.length > 0) {
      const state = formatState(cluster.status?.state)
      if (!selectedStates.includes(state)) return false
    }

    // Filter by search
    if (searchValue) {
      const searchLower = searchValue.toLowerCase()
      return (
        cluster.id.toLowerCase().includes(searchLower) ||
        cluster.metadata?.name?.toLowerCase().includes(searchLower) ||
        getVersion(cluster).toLowerCase().includes(searchLower) ||
        formatState(cluster.status?.state).toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  // Apply sorting
  if (activeSortIndex !== undefined) {
    filteredClusters = [...filteredClusters].sort((a, b) => {
      const aValue = getSortableValue(a, activeSortIndex)
      const bValue = getSortableValue(b, activeSortIndex)
      if (activeSortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      }
      return bValue.localeCompare(aValue)
    })
  }

  // Pagination
  const totalItems = filteredClusters.length
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedClusters = filteredClusters.slice(startIndex, endIndex)

  // Toggle state selection
  const toggleStateFilter = (state: string) => {
    if (selectedStates.includes(state)) {
      setSelectedStates(selectedStates.filter(s => s !== state))
    } else {
      setSelectedStates([...selectedStates, state])
    }
  }

  const toggleVersionFilter = (version: string) => {
    if (selectedVersions.includes(version)) {
      setSelectedVersions(selectedVersions.filter(v => v !== version))
    } else {
      setSelectedVersions([...selectedVersions, version])
    }
  }

  if (loading && clusters.length === 0) {
    return (
      <AppLayout>
        <PageSection>
          <Spinner size="xl" />
        </PageSection>
      </AppLayout>
    )
  }

  if (clusters.length === 0 && !loading) {
    return (
      <AppLayout>
        <PageSection>
          <EmptyState>
            <CubesIcon style={{ fontSize: '48px', marginBottom: '1rem' }} />
            <Title headingLevel="h1" size="lg">
              {t('clusters:list.empty')}
            </Title>
            <EmptyStateBody>
              {t('clusters:list.emptyDescription')}
            </EmptyStateBody>
            <EmptyStateActions style={{ marginTop: '1.5rem' }}>
              <Button variant="primary" onClick={() => navigate('/admin/cluster-catalog')}>
                {t('clusters:list.browseTemplates')}
              </Button>
            </EmptyStateActions>
          </EmptyState>
        </PageSection>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          {t('clusters:title')}
        </Title>
      </PageSection>

      <PageSection>
        <Card>
          <Toolbar style={{ padding: '1rem 1.5rem' }}>
            <ToolbarContent>
              <ToolbarItem style={{ flex: 1 }}>
                <SearchInput
                  placeholder={t('clusters:list.searchPlaceholder')}
                  value={searchValue}
                  onChange={(_event, value) => setSearchValue(value)}
                  onClear={() => setSearchValue('')}
                  style={{ width: '100%', maxWidth: '400px' }}
                />
              </ToolbarItem>
              <ToolbarItem>
                <Dropdown
                  isOpen={isStatusFilterOpen}
                  onSelect={() => setIsStatusFilterOpen(false)}
                  onOpenChange={(isOpen) => setIsStatusFilterOpen(isOpen)}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                      isExpanded={isStatusFilterOpen}
                      icon={<FilterIcon />}
                      style={{ minWidth: '180px' }}
                    >
                      {t('clusters:list.filterStatus')}
                      {selectedStates.length > 0 && (
                        <Badge isRead style={{ marginLeft: '0.5rem' }}>
                          {selectedStates.length}
                        </Badge>
                      )}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    {stateOptions.map(state => (
                      <DropdownItem
                        key={state}
                        onClick={(e) => {
                          e?.stopPropagation()
                          toggleStateFilter(state)
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStates.includes(state)}
                          onChange={() => {}}
                          style={{ marginRight: '0.5rem' }}
                        />
                        {state}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
              <ToolbarItem>
                <Dropdown
                  isOpen={isVersionFilterOpen}
                  onSelect={() => setIsVersionFilterOpen(false)}
                  onOpenChange={(isOpen) => setIsVersionFilterOpen(isOpen)}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsVersionFilterOpen(!isVersionFilterOpen)}
                      isExpanded={isVersionFilterOpen}
                      icon={<FilterIcon />}
                      style={{ minWidth: '180px' }}
                    >
                      {t('clusters:list.filterVersion')}
                      {selectedVersions.length > 0 && (
                        <Badge isRead style={{ marginLeft: '0.5rem' }}>
                          {selectedVersions.length}
                        </Badge>
                      )}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    {versionOptions.map(version => (
                      <DropdownItem
                        key={version}
                        onClick={(e) => {
                          e?.stopPropagation()
                          toggleVersionFilter(version)
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVersions.includes(version)}
                          onChange={() => {}}
                          style={{ marginRight: '0.5rem' }}
                        />
                        {version}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
              <ToolbarItem align={{ default: 'alignEnd' }}>
                <Button variant="primary" onClick={() => navigate('/admin/cluster-catalog')}>
                  {t('clusters:createButton')}
                </Button>
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>

          <CardBody>
            {error && (
              <Alert variant="danger" title={t('clusters:list.error')} isInline style={{ marginBottom: '1rem' }}>
                {error}
              </Alert>
            )}

            <Table variant="compact">
              <Thead>
                <Tr>
                  <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 0 }}>
                    {t('clusters:list.columns.name')}
                  </Th>
                  <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 1 }}>
                    {t('clusters:list.columns.version')}
                  </Th>
                  <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 2 }}>
                    {t('clusters:list.columns.status')}
                  </Th>
                  <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 3 }}>
                    {t('clusters:list.columns.hosts')}
                  </Th>
                  <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 4 }}>
                    {t('clusters:list.columns.createdAt')}
                  </Th>
                  <Th sort={{ sortBy: { index: activeSortIndex, direction: activeSortDirection }, onSort, columnIndex: 5 }}>
                    Tenants
                  </Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginatedClusters.map((cluster) => (
                  <Tr key={cluster.id} style={{ height: '55px' }}>
                    <Td>
                      <Button
                        variant="link"
                        isInline
                        onClick={() => navigate(`/admin/clusters/${cluster.id}`)}
                        style={{ padding: 0, fontSize: 'inherit', color: '#0066cc' }}
                      >
                        {cluster.metadata?.name || cluster.id.substring(0, 12)}
                      </Button>
                    </Td>
                    <Td>{getVersion(cluster)}</Td>
                    <Td>
                      <Label color={getStateBadgeColor(cluster.status?.state)}>
                        {formatState(cluster.status?.state)}
                      </Label>
                    </Td>
                    <Td>{getHostsCount(cluster)}</Td>
                    <Td>
                      {cluster.metadata?.creation_timestamp
                        ? new Date(cluster.metadata.creation_timestamp).toLocaleString()
                        : '-'
                      }
                    </Td>
                    <Td>
                      {cluster.metadata?.tenants && cluster.metadata.tenants.length > 0
                        ? cluster.metadata.tenants.map(tenant => (
                            <Label key={tenant} color="blue" style={{ marginRight: '0.25rem' }}>
                              {tenant}
                            </Label>
                          ))
                        : '-'
                      }
                    </Td>
                    <Td isActionCell>
                      <Dropdown
                        isOpen={openActionMenuId === cluster.id}
                        onSelect={() => setOpenActionMenuId(null)}
                        onOpenChange={(isOpen) => setOpenActionMenuId(isOpen ? cluster.id : null)}
                        toggle={(toggleRef) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() => setOpenActionMenuId(openActionMenuId === cluster.id ? null : cluster.id)}
                            variant="plain"
                            aria-label="Cluster actions"
                          >
                            <EllipsisVIcon />
                          </MenuToggle>
                        )}
                      >
                        <DropdownList>
                          <DropdownItem onClick={() => navigate(`/admin/clusters/${cluster.id}`)}>
                            {t('clusters:list.actions.viewDetails')}
                          </DropdownItem>
                          <DropdownItem onClick={() => navigate(`/admin/clusters/${cluster.id}`)}>
                            Scale Cluster
                          </DropdownItem>
                          <DropdownItem>
                            {t('clusters:list.actions.delete')}
                          </DropdownItem>
                        </DropdownList>
                      </Dropdown>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>

          {filteredClusters.length > 0 && (
            <Toolbar>
              <ToolbarContent style={{ paddingRight: '1rem' }}>
                <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
                  <Pagination
                    itemCount={totalItems}
                    perPage={perPage}
                    page={page}
                    onSetPage={(_, newPage) => setPage(newPage)}
                    onPerPageSelect={(_, newPerPage) => {
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

export default Clusters
