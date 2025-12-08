import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PageSection,
  Title,
  Button,
  Card,
  CardBody,
  CardTitle,
  Gallery,
  GalleryItem,
  Flex,
  FlexItem,
  Spinner,
  Grid,
  GridItem,
  EmptyState,
  EmptyStateBody,
  Alert,
  AlertGroup,
  AlertVariant,
  AlertActionCloseButton,
} from '@patternfly/react-core'
import {
  LayerGroupIcon,
  NetworkIcon,
  VirtualMachineIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  InProgressIcon,
  ExclamationCircleIcon,
  QuestionCircleIcon,
  ServerIcon,
} from '@patternfly/react-icons'
import { getDashboardMetrics } from '../api/dashboard'
import { getVirtualMachines } from '../api/vms'
import { getTemplates } from '../api/templates'
import { listClusters, listClusterTemplates } from '../api/clustersApi'
import { getHosts } from '../api/hosts'
import { DashboardMetrics, VirtualMachine, Template, Cluster } from '../api/types'
import AppLayout from '../components/layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { logger } from '@/utils/logger'

const Dashboard: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common'])
  const { role, username, token, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    templates: { total: 0 },
    hubs: { total: 0 },
    vms: { total: 0, running: 0, stopped: 0, error: 0, provisioning: 0 },
    operations: { active: 0, provisioning: 0, deprovisioning: 0 },
    recentActivity: { vmsCreatedLast24h: 0, vmsCreatedLast7d: 0 },
    resources: { cpuUtilization: 0, memoryUtilization: 0, storageUtilization: 0 }
  })
  const [vms, setVms] = useState<VirtualMachine[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [clustersTotal, setClustersTotal] = useState(0)
  const [clustersReady, setClustersReady] = useState(0)
  const [clustersProgressing, setClustersProgressing] = useState(0)
  const [clustersError, setClustersError] = useState(0)
  const [loading, setLoading] = useState(true)
  const [vmsFetched, setVmsFetched] = useState(false)
  const [loadingClusters, setLoadingClusters] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [clusterTemplatesCount, setClusterTemplatesCount] = useState(0)
  const [clusterTemplatesLoading, setClusterTemplatesLoading] = useState(true)
  const [hostsTotal, setHostsTotal] = useState(0)
  const [hostsAssigned, setHostsAssigned] = useState(0)
  const [hostsUnassigned, setHostsUnassigned] = useState(0)
  const [loadingHosts, setLoadingHosts] = useState(true)
  const [alerts, setAlerts] = useState<Array<{ key: number; title: string; variant: AlertVariant }>>([])

  // Use refs for tracking initial loads to avoid stale closures in intervals
  const isInitialMetricsLoad = useRef(true)
  const isFirstClusterLoad = useRef(true)
  const isFirstHostsLoad = useRef(true)

  // Helper function to add error/success alerts
  const addAlert = (title: string, variant: AlertVariant = AlertVariant.danger) => {
    const key = Date.now()
    setAlerts((prevAlerts) => [...prevAlerts, { key, title, variant }])
    setTimeout(() => {
      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.key !== key))
    }, 5000) // Show for 5 seconds
  }

  useEffect(() => {
    let isActive = true
    const abortController = new AbortController()

    const fetchMetrics = async () => {
      if (!isActive) return

      // Only show loading spinner on first load
      if (isInitialMetricsLoad.current) {
        setLoading(true)
      }

      try {
        const data = await getDashboardMetrics()

        if (isActive) {
          setMetrics(data)
        }
      } catch (error: unknown) {
        if ((error as { name?: string })?.name === 'AbortError') return // Ignore aborted requests
        logger.error('Failed to fetch metrics', error)
        if (isActive && !isInitialMetricsLoad.current) {
          addAlert('Failed to fetch dashboard metrics. Showing cached data.')
        }
        // Don't clear existing data on error - keep showing previous data
      } finally {
        if (isActive && isInitialMetricsLoad.current) {
          setLoading(false)
          isInitialMetricsLoad.current = false
        }
      }
    }

    fetchMetrics()

    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => {
      isActive = false
      abortController.abort()
      clearInterval(interval)
    }
  }, [])

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await getTemplates()
        setTemplates(response.items || [])
      } catch (error: unknown) {
        logger.error('Failed to fetch templates', error)
        addAlert('Failed to load VM templates')
        // Don't clear existing data on error - keep showing previous data
      } finally {
        setTemplatesLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  // Fetch cluster templates for admins
  useEffect(() => {
    if (role !== 'fulfillment-admin') {
      setClusterTemplatesLoading(false)
      return
    }

    const fetchClusterTemplates = async () => {
      try {
        const response = await listClusterTemplates()
        setClusterTemplatesCount(response.total || 0)
      } catch (error: unknown) {
        logger.error('Failed to fetch cluster templates', error)
        addAlert('Failed to load cluster templates')
        setClusterTemplatesCount(0)
      } finally {
        setClusterTemplatesLoading(false)
      }
    }

    fetchClusterTemplates()
  }, [role])

  // Fetch VMs for the logged-in user
  useEffect(() => {
    // Don't fetch VMs until auth is complete AND we have username AND token
    if (authLoading || !username || !token) {
      setVmsFetched(false)
      return
    }

    let isActive = true
    const abortController = new AbortController()
    let retryCount = 0
    const maxRetries = 3 // Reduced from 10

    const fetchVMs = async () => {
      if (!isActive) return

      try {
        const response = await getVirtualMachines()

        // Validate response is a proper list response, not HTML
        if (response && typeof response === 'object' && 'items' in response) {
          if (isActive) {
            setVms(response.items || [])
            setVmsFetched(true)
            retryCount = 0 // Reset retry count on success
          }
        } else {
          logger.error('Invalid VM response (possibly HTML)')
          retryCount++
          if (retryCount >= maxRetries && isActive) {
            addAlert('Failed to load virtual machines after multiple attempts')
          }
        }
      } catch (error: unknown) {
        if ((error as { name?: string })?.name === 'AbortError') return // Ignore aborted requests
        logger.error('Failed to fetch VMs', error)
        retryCount++
        if (retryCount >= maxRetries && isActive && vmsFetched) {
          // Only show error if we previously had data
          addAlert('Failed to refresh virtual machines. Showing cached data.')
        } else if (retryCount >= maxRetries && isActive && !vmsFetched) {
          addAlert('Failed to load virtual machines')
        }
      }
    }

    // Initial fetch
    fetchVMs()

    // Single polling interval every 30 seconds
    const pollInterval = setInterval(fetchVMs, 30000)

    return () => {
      isActive = false
      abortController.abort()
      clearInterval(pollInterval)
    }
    // vmsFetched is intentionally excluded to prevent infinite loops - it's used for conditional error messages only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, username, token])

  // Fetch clusters for admin users
  useEffect(() => {
    if (role !== 'fulfillment-admin') {
      return
    }

    let isActive = true
    const abortController = new AbortController()

    const fetchClusters = async () => {
      if (!isActive) return

      // Only show loading spinner on first load, not on auto-refresh
      if (isFirstClusterLoad.current) {
        setLoadingClusters(true)
      }
      try {
        const response = await listClusters()
        const clusterItems = response.items || []

        if (!isActive) return

        // Calculate status counts before updating state
        let ready = 0
        let progressing = 0
        let error = 0
        clusterItems.forEach(cluster => {
          const state = cluster.status?.state || ''
          if (state.includes('READY')) {
            ready++
          } else if (state.includes('PROGRESSING')) {
            progressing++
          } else if (state.includes('FAILED') || state.includes('ERROR')) {
            error++
          }
        })

        // Batch all state updates together to prevent flickering
        setClusters(clusterItems)
        setClustersTotal(response.total || 0)
        setClustersReady(ready)
        setClustersProgressing(progressing)
        setClustersError(error)
      } catch (error: unknown) {
        if ((error as { name?: string })?.name === 'AbortError') return // Ignore aborted requests
        logger.error('Failed to fetch clusters', error)
        if (isActive && !isFirstClusterLoad.current) {
          addAlert('Failed to refresh clusters. Showing cached data.')
        }
        // Don't clear existing data on error - keep showing previous data
      } finally {
        if (isActive) {
          setLoadingClusters(false)
          if (isFirstClusterLoad.current) {
            isFirstClusterLoad.current = false
          }
        }
      }
    }

    fetchClusters()

    // Refresh clusters every 30 seconds
    const interval = setInterval(fetchClusters, 30000)
    return () => {
      isActive = false
      abortController.abort()
      clearInterval(interval)
    }
  }, [role])

  // Fetch bare metal hosts for admin users
  useEffect(() => {
    if (role !== 'fulfillment-admin') {
      setLoadingHosts(false)
      return
    }

    let isActive = true
    const abortController = new AbortController()

    const fetchHosts = async () => {
      if (!isActive) return

      // Only show loading spinner on first load, not on auto-refresh
      if (isFirstHostsLoad.current) {
        setLoadingHosts(true)
      }
      try {
        const response = await getHosts()
        const hostItems = response.items || []

        if (!isActive) return

        setHostsTotal(response.total || 0)

        // Calculate assigned vs unassigned hosts
        let assigned = 0
        let unassigned = 0
        hostItems.forEach(host => {
          // A host is assigned if it has a cluster in its status
          if (host.status?.cluster) {
            assigned++
          } else {
            unassigned++
          }
        })
        setHostsAssigned(assigned)
        setHostsUnassigned(unassigned)
      } catch (error: unknown) {
        if ((error as { name?: string })?.name === 'AbortError') return // Ignore aborted requests
        logger.error('Failed to fetch hosts', error)
        if (isActive && !isFirstHostsLoad.current) {
          addAlert('Failed to refresh bare metal hosts. Showing cached data.')
        }
        // Don't clear existing data on error - keep showing previous data
      } finally {
        if (isActive) {
          setLoadingHosts(false)
          if (isFirstHostsLoad.current) {
            isFirstHostsLoad.current = false
          }
        }
      }
    }

    fetchHosts()

    // Refresh hosts every 30 seconds
    const interval = setInterval(fetchHosts, 30000)
    return () => {
      isActive = false
      abortController.abort()
      clearInterval(interval)
    }
  }, [role])

  // Helper to format VM state
  const formatState = (state?: string): string => {
    if (!state) return 'Unknown'
    // Remove "VIRTUAL_MACHINE_STATE_" prefix and capitalize first letter only
    const stateWithoutPrefix = state.replace('VIRTUAL_MACHINE_STATE_', '')
    return stateWithoutPrefix.charAt(0).toUpperCase() + stateWithoutPrefix.slice(1).toLowerCase()
  }

  // Helper to format cluster state into readable text
  const formatClusterState = (state?: string): string => {
    if (!state) return 'Unknown'

    // Handle cluster condition types
    if (state.includes('CLUSTER_CONDITION_TYPE_')) {
      const cleanState = state.replace('CLUSTER_CONDITION_TYPE_', '')
      return cleanState.charAt(0).toUpperCase() + cleanState.slice(1).toLowerCase()
    }

    // Handle cluster state types
    if (state.includes('CLUSTER_STATE_')) {
      const cleanState = state.replace('CLUSTER_STATE_', '')
      return cleanState.charAt(0).toUpperCase() + cleanState.slice(1).toLowerCase()
    }

    return state.charAt(0).toUpperCase() + state.slice(1).toLowerCase()
  }

  // Helper to get status badge color
  const getStatusBadgeColor = (state?: string): { bg: string; text: string } => {
    if (!state) {
      return { bg: '#f0f0f0', text: '#6a6e73' }
    }

    if (state.includes('READY')) {
      return { bg: '#f0fdf4', text: '#16a34a' } // Green
    } else if (state.includes('PROGRESSING')) {
      return { bg: '#eff6ff', text: '#2563eb' } // Blue
    } else if (state.includes('FAILED') || state.includes('ERROR')) {
      return { bg: '#fef2f2', text: '#dc2626' } // Red
    } else {
      return { bg: '#f0f0f0', text: '#6a6e73' } // Gray
    }
  }

  // Helper to get status icon
  const getStatusIcon = (state?: string): JSX.Element => {
    if (!state) {
      return <QuestionCircleIcon style={{ color: '#6a6e73' }} />
    }

    if (state.includes('READY')) {
      return <CheckCircleIcon style={{ color: '#3e8635' }} />
    } else if (state.includes('PROGRESSING')) {
      return <InProgressIcon style={{ color: '#0066cc' }} />
    } else if (state.includes('FAILED')) {
      return <ExclamationCircleIcon style={{ color: '#c9190b' }} />
    } else {
      return <QuestionCircleIcon style={{ color: '#6a6e73' }} />
    }
  }

  // Memoize sorted clusters to prevent flickering on refresh
  const sortedClusters = useMemo(() => {
    return [...clusters].sort((a, b) => {
      const aTime = a.metadata?.creation_timestamp || ''
      const bTime = b.metadata?.creation_timestamp || ''
      return bTime.localeCompare(aTime) // Sort descending (newest first)
    })
  }, [clusters])

  // Memoize sorted VMs to prevent flickering on refresh
  const userVMs = useMemo(() => {
    if (!username) return []
    return vms.filter((vm) => {
      const creators = vm.metadata?.creators || []
      return creators.includes(username)
    })
  }, [vms, username])

  const sortedUserVMs = useMemo(() => {
    return [...userVMs].sort((a, b) => {
      const aTime = a.metadata?.creation_timestamp || ''
      const bTime = b.metadata?.creation_timestamp || ''
      return bTime.localeCompare(aTime) // Sort descending (newest first)
    })
  }, [userVMs])

  return (
    <AppLayout>
      <AlertGroup isToast isLiveRegion>
        {alerts.map((alert) => (
          <Alert
            key={alert.key}
            variant={alert.variant}
            title={alert.title}
            timeout={5000}
            actionClose={
              <AlertActionCloseButton
                onClose={() => setAlerts((prev) => prev.filter((a) => a.key !== alert.key))}
              />
            }
          />
        ))}
      </AlertGroup>
      <PageSection>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
          {t('dashboard:title')}
        </Title>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spinner size="xl" />
            <p style={{ marginTop: '1rem', color: '#6a6e73' }}>{t('dashboard:loading')}</p>
          </div>
        ) : (
          <Grid hasGutter>
            <GridItem sm={12} md={12} lg={8} xl={8}>
              <div style={{ height: '100%' }}>
                <Gallery hasGutter minWidths={{ default: '100%', sm: '100%', md: '190px', lg: '210px', xl: '225px' }}>
          <GalleryItem>
            <Card isFullHeight>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <span style={{ color: '#3e8635', fontSize: '1.5rem' }}>
                      <LayerGroupIcon />
                    </span>
                  </FlexItem>
                  <FlexItem>
                    {t('dashboard:metrics.templates.title')}
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                {(templatesLoading || clusterTemplatesLoading) ? (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <Spinner size="md" />
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                      {role === 'fulfillment-admin' ? templates.length + clusterTemplatesCount : templates.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                      {role === 'fulfillment-admin'
                        ? `${templates.length} VM · ${clusterTemplatesCount} Cluster`
                        : t('dashboard:metrics.templates.available')
                      }
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </GalleryItem>

          {role === 'fulfillment-admin' && (
            <GalleryItem>
              <Card isFullHeight>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <span style={{ color: '#f0ab00', fontSize: '1.5rem' }}>
                        <NetworkIcon />
                      </span>
                    </FlexItem>
                    <FlexItem>
                      {t('dashboard:metrics.hubs.title')}
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <Spinner size="md" />
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.hubs.total}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                        {t('dashboard:metrics.hubs.description')}
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </GalleryItem>
          )}

          {role === 'fulfillment-admin' && (
            <GalleryItem>
              <Card isFullHeight>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <span style={{ color: '#06c', fontSize: '1.5rem' }}>
                        <LayerGroupIcon />
                      </span>
                    </FlexItem>
                    <FlexItem>
                      {t('dashboard:metrics.clusters.title')}
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  {loadingClusters ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <Spinner size="md" />
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{clustersTotal}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                        {clustersReady} {t('dashboard:metrics.clusters.ready')} · {clustersProgressing} {t('dashboard:metrics.clusters.progressing')} · {clustersError} {t('dashboard:metrics.clusters.error')}
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </GalleryItem>
          )}

          {role === 'fulfillment-admin' && (
            <GalleryItem>
              <Card isFullHeight>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <span style={{ color: '#009596', fontSize: '1.5rem' }}>
                        <ServerIcon />
                      </span>
                    </FlexItem>
                    <FlexItem>
                      {t('dashboard:metrics.hosts.title')}
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  {loadingHosts ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <Spinner size="md" />
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{hostsTotal}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                        {hostsAssigned} {t('dashboard:metrics.hosts.allocated')} · {hostsUnassigned} {t('dashboard:metrics.hosts.available')}
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </GalleryItem>
          )}

          <GalleryItem>
            <Card isFullHeight>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <span style={{ color: '#8476d1', fontSize: '1.5rem' }}>
                      <VirtualMachineIcon />
                    </span>
                  </FlexItem>
                  <FlexItem>
                    {t('dashboard:metrics.vms.title')}
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <Spinner size="md" />
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.vms.total}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                      {metrics.vms.running} {t('dashboard:metrics.vms.running')} · {metrics.vms.stopped} {t('dashboard:metrics.vms.stopped')} · {metrics.vms.error} {t('dashboard:metrics.vms.error')}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </GalleryItem>
              </Gallery>
              </div>
            </GridItem>

            <GridItem sm={12} md={12} lg={4} xl={4}>
              {role === 'fulfillment-admin' ? (
                <Card style={{ height: '100%' }}>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        <LayerGroupIcon style={{ marginRight: '0.5rem', color: '#06c' }} />
                      </FlexItem>
                      <FlexItem>
                        {t('dashboard:sections.myManagedClusters')}
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {loadingClusters || authLoading ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <Spinner size="md" />
                      </div>
                    ) : clusters.length === 0 ? (
                      <EmptyState>
                        <EmptyStateBody>
                          <div style={{ color: '#6a6e73', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            {t('dashboard:empty.noClusters')}
                          </div>
                        </EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <div>
                        {sortedClusters
                          .slice(0, 3)
                          .map((cluster, index, array) => (
                            <div
                              key={cluster.id}
                              onClick={() => navigate(`/admin/clusters/${cluster.id}`)}
                              style={{
                                padding: '0.75rem',
                                cursor: 'pointer',
                                borderBottom: index < array.length - 1 ? '1px solid #d2d2d2' : 'none',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f5'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                  {getStatusIcon(cluster.status?.state)}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>
                                      {cluster.metadata?.name || cluster.id}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                                      {cluster.id}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '3px',
                                    backgroundColor: getStatusBadgeColor(cluster.status?.state).bg,
                                    color: getStatusBadgeColor(cluster.status?.state).text,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {formatClusterState(cluster.status?.state)}
                                </div>
                              </div>
                            </div>
                          ))}
                        {clusters.length > 3 && (
                          <div style={{ padding: '0.75rem', borderTop: '1px solid #d2d2d2' }}>
                            <Button
                              variant="link"
                              isInline
                              onClick={() => navigate('/admin/clusters')}
                              style={{ padding: 0, fontSize: '0.875rem' }}
                            >
                              {t('dashboard:actions.viewAllClusters', { count: clusters.length })}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              ) : (
                <Card style={{ height: '100%' }}>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        <VirtualMachineIcon style={{ marginRight: '0.5rem', color: '#8476d1' }} />
                      </FlexItem>
                      <FlexItem>
                        {t('dashboard:sections.myVirtualMachines')}
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {!vmsFetched ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <Spinner size="md" />
                      </div>
                    ) : userVMs.length === 0 ? (
                      <EmptyState>
                        <EmptyStateBody>
                          <div style={{ color: '#6a6e73', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            {t('dashboard:empty.noVMs')}
                          </div>
                        </EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <div>
                        {sortedUserVMs
                          .slice(0, 3)
                          .map((vm, index, array) => (
                            <div
                              key={vm.id}
                              onClick={() => navigate(`/virtual-machines/${vm.id}`)}
                              style={{
                                padding: '0.75rem',
                                cursor: 'pointer',
                                borderBottom: index < array.length - 1 ? '1px solid #d2d2d2' : 'none',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f5'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                {getStatusIcon(vm.status?.state)}
                                <div>
                                  <div style={{ fontWeight: 600 }}>
                                    {vm.metadata?.name || vm.id}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                                    {vm.id}
                                  </div>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginLeft: '1.5rem' }}>
                                {formatState(vm.status?.state)}
                              </div>
                            </div>
                          ))}
                          {userVMs.length > 3 && (
                            <div style={{ padding: '0.75rem', borderTop: '1px solid #d2d2d2' }}>
                              <Button
                                variant="link"
                                isInline
                                onClick={() => navigate('/virtual-machines')}
                                style={{ padding: 0, fontSize: '0.875rem' }}
                              >
                                {t('dashboard:actions.viewAllVMs', { count: userVMs.length })}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                  </CardBody>
                </Card>
              )}
            </GridItem>
          </Grid>
        )}
      </PageSection>

      <PageSection>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
          {t('dashboard:sections.quickActions')}
        </Title>
        <Flex spaceItems={{ default: 'spaceItemsMd' }}>
          {role === 'fulfillment-admin' && (
            <FlexItem>
              <Button
                variant="primary"
                icon={<PlusCircleIcon />}
                onClick={() => navigate('/admin/cluster-catalog')}
                style={{ minWidth: '180px' }}
              >
                {t('dashboard:actions.createCluster')}
              </Button>
            </FlexItem>
          )}
          <FlexItem>
            <Button
              variant="primary"
              icon={<PlusCircleIcon />}
              onClick={() => navigate('/templates')}
              style={{ minWidth: '180px' }}
            >
              {t('dashboard:actions.createVM')}
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="secondary"
              onClick={() => navigate('/templates')}
            >
              {t('dashboard:actions.viewTemplates')}
            </Button>
          </FlexItem>
          {role === 'fulfillment-admin' && (
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => navigate('/hubs')}
              >
                {t('dashboard:actions.manageHubs')}
              </Button>
            </FlexItem>
          )}
        </Flex>
      </PageSection>
    </AppLayout>
  )
}

export default Dashboard
