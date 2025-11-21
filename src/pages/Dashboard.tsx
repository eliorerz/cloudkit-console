import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '@patternfly/react-icons'
import { getDashboardMetrics } from '../api/dashboard'
import { getVirtualMachines, createVirtualMachine } from '../api/vms'
import { getTemplates } from '../api/templates'
import { listClusters } from '../api/clustersApi'
import { DashboardMetrics, VirtualMachine, Template, Cluster } from '../api/types'
import AppLayout from '../components/layouts/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { CreateVMWizard } from '../components/wizards/CreateVMWizard'

const Dashboard: React.FC = () => {
  const { role, username } = useAuth()
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
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [loadingVMs, setLoadingVMs] = useState(true)
  const [loadingClusters, setLoadingClusters] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    const fetchMetrics = async () => {
      if (isInitialLoad) {
        setLoading(true)
      }
      const data = await getDashboardMetrics()

      setMetrics(data)
      if (isInitialLoad) {
        setLoading(false)
        setIsInitialLoad(false)
      }
    }

    fetchMetrics()

    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [isInitialLoad, role])

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await getTemplates()
        setTemplates(response.items || [])
      } catch (error) {
        console.error('Failed to fetch templates:', error)
        setTemplates([])
      }
    }

    fetchTemplates()
  }, [])

  // Fetch VMs for the logged-in user
  useEffect(() => {
    const fetchVMs = async () => {
      setLoadingVMs(true)
      try {
        const response = await getVirtualMachines()
        setVms(response.items || [])
      } catch (error) {
        console.error('Failed to fetch VMs:', error)
        setVms([])
      } finally {
        setLoadingVMs(false)
      }
    }

    fetchVMs()

    // Refresh VMs every 30 seconds
    const interval = setInterval(fetchVMs, 30000)
    return () => clearInterval(interval)
  }, [username])

  // Fetch clusters for admin users
  useEffect(() => {
    if (role !== 'fulfillment-admin') {
      return
    }

    const fetchClusters = async () => {
      setLoadingClusters(true)
      try {
        const response = await listClusters()
        const clusterItems = response.items || []
        setClusters(clusterItems)
        setClustersTotal(response.total || 0)

        // Calculate status counts
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
        setClustersReady(ready)
        setClustersProgressing(progressing)
        setClustersError(error)
      } catch (error) {
        console.error('Failed to fetch clusters:', error)
        setClusters([])
        setClustersTotal(0)
        setClustersReady(0)
        setClustersProgressing(0)
        setClustersError(0)
      } finally {
        setLoadingClusters(false)
      }
    }

    fetchClusters()

    // Refresh clusters every 30 seconds
    const interval = setInterval(fetchClusters, 30000)
    return () => clearInterval(interval)
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

  // Handle VM creation from wizard
  const handleCreateVM = async (vmId: string, templateId: string, parameters: Record<string, any>) => {
    await createVirtualMachine({
      id: vmId,
      spec: {
        template: templateId,
        template_parameters: parameters
      }
    })
    // Refresh VMs list
    const response = await getVirtualMachines()
    setVms(response.items || [])
  }

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
          Overview
        </Title>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spinner size="xl" />
            <p style={{ marginTop: '1rem', color: '#6a6e73' }}>Loading metrics...</p>
          </div>
        ) : (
          <Grid hasGutter>
            <GridItem sm={12} md={12} lg={8} xl={8}>
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
                    Templates
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.templates.total}</div>
                <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                  available
                </div>
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
                      Hubs
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.hubs.total}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                    management hubs
                  </div>
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
                      Managed Clusters
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{clustersTotal}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                    {clustersReady} ready · {clustersProgressing} progressing · {clustersError} error
                  </div>
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
                    Virtual Machines
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.vms.total}</div>
                <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                  {metrics.vms.running} running · {metrics.vms.stopped} stopped · {metrics.vms.error} error
                </div>
              </CardBody>
            </Card>
          </GalleryItem>
              </Gallery>
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
                        My Managed Clusters
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {loadingClusters ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <Spinner size="md" />
                      </div>
                    ) : clusters.length === 0 ? (
                      <EmptyState>
                        <EmptyStateBody>
                          <div style={{ color: '#6a6e73', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            No managed clusters found
                          </div>
                        </EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <div>
                        {clusters
                          .sort((a, b) => {
                            const aTime = a.metadata?.creation_timestamp || ''
                            const bTime = b.metadata?.creation_timestamp || ''
                            return bTime.localeCompare(aTime) // Sort descending (newest first)
                          })
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
                              View all {clusters.length} clusters →
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
                        My Virtual Machines
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {loadingVMs ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <Spinner size="md" />
                      </div>
                    ) : vms.length === 0 ? (
                      <EmptyState>
                        <EmptyStateBody>
                          <div style={{ color: '#6a6e73', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            No virtual machines found
                          </div>
                        </EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <div>
                        {vms
                          .filter((vm) => {
                            // Filter by logged-in user's username
                            if (!username) return false
                            return vm.metadata?.creators?.includes(username)
                          })
                          .sort((a, b) => {
                            const aTime = a.metadata?.creation_timestamp || ''
                            const bTime = b.metadata?.creation_timestamp || ''
                            return bTime.localeCompare(aTime) // Sort descending (newest first)
                          })
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
                        {vms.filter((vm) => vm.metadata?.creators?.includes(username || '')).length > 3 && (
                          <div style={{ padding: '0.75rem', borderTop: '1px solid #d2d2d2' }}>
                            <Button
                              variant="link"
                              isInline
                              onClick={() => navigate('/virtual-machines')}
                              style={{ padding: 0, fontSize: '0.875rem' }}
                            >
                              View all {vms.filter((vm) => vm.metadata?.creators?.includes(username || '')).length} VMs →
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
          Quick Actions
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
                Create Cluster
              </Button>
            </FlexItem>
          )}
          <FlexItem>
            <Button
              variant="primary"
              icon={<PlusCircleIcon />}
              onClick={() => setWizardOpen(true)}
              style={{ minWidth: '180px' }}
            >
              Create VM
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="secondary"
              onClick={() => navigate('/templates')}
            >
              View Templates
            </Button>
          </FlexItem>
          {role === 'fulfillment-admin' && (
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => navigate('/hubs')}
              >
                Manage Hubs
              </Button>
            </FlexItem>
          )}
        </Flex>
      </PageSection>

      <CreateVMWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={handleCreateVM}
        templates={templates}
      />
    </AppLayout>
  )
}

export default Dashboard
