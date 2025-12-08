import { useEffect, useState, useMemo, useCallback } from 'react'
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
  Modal,
  ModalVariant,
  Form,
  FormGroup,
  TextInput,
} from '@patternfly/react-core'
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table'
import { CubesIcon, EllipsisVIcon, FilterIcon } from '@patternfly/react-icons'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layouts/AppLayout'
import { listClusters, scaleCluster, deleteCluster } from '../api/clustersApi'
import { Cluster, ClusterState } from '../api/types'
import { getHost } from '../api/hosts'
import { getHostClassById, getHostClasses } from '../api/host-classes'
import { logger } from '@/utils/logger'

const Clusters: React.FC = () => {
  const { t } = useTranslation(['clusters', 'common'])
  const navigate = useNavigate()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)

  // Scale modal state
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)
  const [scaleSize, setScaleSize] = useState('')
  const [scalingSizeError, setScalingSizeError] = useState('')
  const [isScaling, setIsScaling] = useState(false)
  const [hostClassesData, setHostClassesData] = useState<Record<string, unknown>>({})
  const [staticHostClasses, setStaticHostClasses] = useState<Record<string, unknown>>({})

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [clusterToDelete, setClusterToDelete] = useState<Cluster | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

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
    } catch (err: unknown) {
      logger.error('Failed to load clusters', err)
      setError((err as { message?: string })?.message || 'Failed to load clusters')
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

  const formatState = useCallback((state?: ClusterState) => {
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
  }, [t])

  const getVersion = (cluster: Cluster): string => {
    const params = cluster.spec?.template_parameters as Record<string, { value?: unknown }> | undefined
    if (!params) return '-'

    // Try common parameter names for version - extract value from protobuf wrapper
    const getVal = (key: string) => {
      const param = params[key] as { value?: unknown } | undefined
      return param?.value ? String(param.value) : null
    }

    return getVal('ocp_version') || getVal('openshift_version') || getVal('version') || getVal('cluster_version') || '4.20.4'
  }

  const getHostsCount = (cluster: Cluster): number => {
    const nodeSets = cluster.status?.node_sets || cluster.spec?.node_sets
    if (!nodeSets) return 0

    return Object.values(nodeSets).reduce((total, nodeSet) => {
      // Count actual hosts in the array, not the size property
      return total + (nodeSet.hosts?.length || 0)
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
  }, [clusters, formatState])

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

  const onSort = (_event: React.SyntheticEvent, index: number, direction: 'asc' | 'desc') => {
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

  const openScaleModal = async (cluster: Cluster) => {
    setSelectedCluster(cluster)

    // Load host classes data
    const staticClasses = await getHostClasses()
    setStaticHostClasses(staticClasses)

    // Load hosts data for this cluster
    const hostClassesMap: Record<string, unknown> = {}

    if (cluster.status?.node_sets) {
      for (const [, nodeSet] of Object.entries(cluster.status.node_sets)) {
        if (nodeSet.hosts) {
          for (const hostId of nodeSet.hosts) {
            try {
              const host = await getHost(hostId)
              if (host.spec?.class) {
                const hostClass = await getHostClassById(host.spec.class)
                hostClassesMap[host.spec.class] = hostClass
              }
            } catch (err) {
              logger.error('Failed to load host', err)
            }
          }
        }
      }
    }

    setHostClassesData(hostClassesMap)

    // Set initial size
    if (cluster.status?.node_sets && Object.keys(cluster.status.node_sets).length > 0) {
      const firstNodeSet = Object.values(cluster.status.node_sets)[0]
      setScaleSize(String(firstNodeSet.size || 1))
    }

    setScalingSizeError('')
    setIsScaleModalOpen(true)
  }

  const handleScaleCluster = async () => {
    if (!selectedCluster) return

    const newSize = parseInt(scaleSize, 10)
    if (isNaN(newSize) || newSize < 1) {
      setScalingSizeError('Size must be a number greater than or equal to 1')
      return
    }

    const nodeSets = selectedCluster.status?.node_sets || selectedCluster.spec?.node_sets
    if (!nodeSets || Object.keys(nodeSets).length === 0) {
      setScalingSizeError('No node sets found')
      return
    }

    const nodeSetName = Object.keys(nodeSets)[0]
    const nodeSet = nodeSets[nodeSetName]
    const currentSize = nodeSet.size || 1
    const hostClass = nodeSet.host_class || ''

    if (!hostClass) {
      setScalingSizeError('Host class not found for node set')
      return
    }

    if (newSize === currentSize) {
      setScalingSizeError('The new size is the same as the current size')
      return
    }

    try {
      setIsScaling(true)
      setScalingSizeError('')

      await scaleCluster(selectedCluster.id, nodeSetName, newSize, hostClass)

      setIsScaleModalOpen(false)
      setScaleSize('')
      setSelectedCluster(null)

      // Reload clusters list
      loadClusters()
    } catch (err: unknown) {
      logger.error('Failed to scale cluster', err)
      setScalingSizeError((err as { message?: string })?.message || 'Failed to scale cluster')
    } finally{
      setIsScaling(false)
    }
  }

  const openDeleteModal = (cluster: Cluster) => {
    setClusterToDelete(cluster)
    setDeleteConfirmation('')
    setIsDeleteModalOpen(true)
  }

  const handleDeleteCluster = async () => {
    if (!clusterToDelete) return

    const clusterName = clusterToDelete.metadata?.name || clusterToDelete.id.substring(0, 12)
    if (deleteConfirmation !== clusterName) {
      return
    }

    try {
      setIsDeleting(true)

      await deleteCluster(clusterToDelete.id)

      setIsDeleteModalOpen(false)
      setClusterToDelete(null)
      setDeleteConfirmation('')

      // Reload clusters list
      loadClusters()
    } catch (err: unknown) {
      logger.error('Failed to delete cluster', err)
      setError((err as { message?: string })?.message || 'Failed to delete cluster')
    } finally {
      setIsDeleting(false)
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
                          <DropdownItem onClick={() => {
                            setOpenActionMenuId(null)
                            openScaleModal(cluster)
                          }}>
                            Scale Cluster
                          </DropdownItem>
                          <DropdownItem
                            onClick={() => {
                              setOpenActionMenuId(null)
                              openDeleteModal(cluster)
                            }}
                            style={{ color: 'var(--pf-v5-global--danger-color--100)' }}
                          >
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

      <Modal
        variant={ModalVariant.small}
        title={`Scale cluster ${selectedCluster?.metadata?.name || ''}`}
        isOpen={isScaleModalOpen}
        onClose={() => {
          setIsScaleModalOpen(false)
          setScaleSize('')
          setScalingSizeError('')
          setSelectedCluster(null)
        }}
      >
        <div style={{ padding: '0' }}>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            padding: '1.5rem 1.5rem 1rem 1.5rem',
            color: '#151515'
          }}>
            Scale cluster {selectedCluster?.metadata?.name || ''}
          </div>
          {selectedCluster?.status?.node_sets && Object.keys(selectedCluster.status.node_sets).length > 0 && (() => {
            const nodeSet = Object.values(selectedCluster.status.node_sets)[0]
            const hostClassId = nodeSet.host_class
            const fulfillmentClass = hostClassId ? hostClassesData[hostClassId] as { metadata?: { name?: string } } : null
            const className = fulfillmentClass?.metadata?.name
            const staticClass = className ? staticHostClasses[className] as {
              name?: string
              description?: string
              cpu?: { type?: string; cores?: number; sockets?: number }
              ram?: { size?: string }
              gpu?: { model?: string; count?: number }
            } | null : null

            return (
              <>
                <div style={{
                  padding: '1rem',
                  margin: '0 1.5rem 1rem 1.5rem',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #d2d2d2',
                  borderRadius: '3px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current cluster size
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#151515' }}>
                    {nodeSet.size || 1} nodes
                  </div>
                </div>

                {staticClass && (
                  <div style={{ margin: '0 1.5rem 1.5rem 1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#151515' }}>
                      Node specifications
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      gap: '0.5rem 1rem',
                      fontSize: '0.875rem'
                    }}>
                      <div style={{ color: '#6a6e73' }}>Host Class:</div>
                      <div style={{ fontWeight: 500 }}>
                        {staticClass.name}
                        {staticClass.description && (
                          <div style={{ fontSize: '0.8125rem', color: '#6a6e73', marginTop: '0.125rem' }}>
                            {staticClass.description}
                          </div>
                        )}
                      </div>

                      <div style={{ color: '#6a6e73' }}>CPU Type:</div>
                      <div>{staticClass.cpu?.type || '-'}</div>

                      <div style={{ color: '#6a6e73' }}>CPU Cores:</div>
                      <div>{staticClass.cpu ? ((staticClass.cpu.cores || 0) * (staticClass.cpu.sockets || 0)) : '-'}</div>

                      <div style={{ color: '#6a6e73' }}>RAM Size:</div>
                      <div>{staticClass.ram?.size || '-'}</div>

                      <div style={{ color: '#6a6e73' }}>GPU Model:</div>
                      <div>
                        {staticClass.gpu?.model ? (
                          <Label color="purple" style={{ fontSize: '0.875rem' }}>
                            {staticClass.gpu.model}
                          </Label>
                        ) : '-'}
                      </div>

                      <div style={{ color: '#6a6e73' }}>GPU Count:</div>
                      <div>{staticClass.gpu?.count || '-'}</div>
                    </div>
                  </div>
                )}
              </>
            )
          })()}

          <Form style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
            <FormGroup label="New cluster size" isRequired fieldId="scale-size">
              <TextInput
                isRequired
                type="number"
                id="scale-size"
                name="scale-size"
                value={scaleSize}
                onChange={(_event, value) => {
                  setScaleSize(value)
                  setScalingSizeError('')
                }}
                validated={scalingSizeError ? 'error' : 'default'}
                min={1}
                placeholder="Enter number of nodes"
              />
              {scalingSizeError && (
                <div style={{ marginTop: '0.5rem', color: '#c9190b', fontSize: '0.875rem' }}>
                  {scalingSizeError}
                </div>
              )}
              {!scalingSizeError && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6a6e73' }}>
                  Enter a value between 1 and the maximum available capacity
                </div>
              )}
            </FormGroup>

            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #d2d2d2',
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-start'
            }}>
              <Button
                variant="primary"
                onClick={handleScaleCluster}
                isDisabled={isScaling || !scaleSize}
                isLoading={isScaling}
              >
                {isScaling ? 'Scaling cluster...' : 'Scale cluster'}
              </Button>
              <Button
                variant="link"
                onClick={() => {
                  setIsScaleModalOpen(false)
                  setScaleSize('')
                  setScalingSizeError('')
                  setSelectedCluster(null)
                }}
                isDisabled={isScaling}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        variant={ModalVariant.small}
        title="Delete cluster"
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setClusterToDelete(null)
          setDeleteConfirmation('')
        }}
      >
        <div style={{ padding: '0' }}>
          <div style={{
            fontSize: '1rem',
            padding: '1.5rem 1.5rem 1rem 1.5rem',
            color: '#151515'
          }}>
            <Alert
              variant="danger"
              title="Warning"
              isInline
              style={{ marginBottom: '1rem' }}
            >
              This action cannot be undone. This will permanently delete the cluster and all associated resources.
            </Alert>
            <p style={{ marginBottom: '1rem' }}>
              Please type <strong>{clusterToDelete?.metadata?.name || clusterToDelete?.id.substring(0, 12)}</strong> to confirm deletion.
            </p>
          </div>

          <Form style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
            <FormGroup label="Cluster name" isRequired fieldId="delete-confirmation">
              <TextInput
                isRequired
                type="text"
                id="delete-confirmation"
                name="delete-confirmation"
                value={deleteConfirmation}
                onChange={(_event, value) => setDeleteConfirmation(value)}
                placeholder={clusterToDelete?.metadata?.name || clusterToDelete?.id.substring(0, 12)}
              />
            </FormGroup>

            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #d2d2d2',
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-start'
            }}>
              <Button
                variant="danger"
                onClick={handleDeleteCluster}
                isDisabled={
                  isDeleting ||
                  !deleteConfirmation ||
                  deleteConfirmation !== (clusterToDelete?.metadata?.name || clusterToDelete?.id.substring(0, 12))
                }
                isLoading={isDeleting}
              >
                {isDeleting ? 'Deleting cluster...' : 'Delete cluster'}
              </Button>
              <Button
                variant="link"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setClusterToDelete(null)
                  setDeleteConfirmation('')
                }}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </AppLayout>
  )
}

export default Clusters
