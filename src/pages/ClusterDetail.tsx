import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
  Tabs,
  Tab,
  TabTitleText,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Card,
  CardBody,
  Label,
  Spinner,
  Alert,
  Button,
  AlertGroup,
  AlertVariant,
  AlertActionCloseButton,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Flex,
  FlexItem,
  Modal,
  ModalVariant,
  Form,
  FormGroup,
  TextInput,
} from '@patternfly/react-core'
import { ExternalLinkAltIcon, CopyIcon, DownloadIcon, PlusCircleIcon, TrashIcon } from '@patternfly/react-icons'
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table'
import AppLayout from '../components/layouts/AppLayout'
import { getCluster, getClusterPassword, getClusterKubeconfig, scaleCluster, deleteCluster } from '../api/clustersApi'
import { Cluster, ClusterState, Host } from '../api/types'
import { getUserManager } from '../auth/oidcConfig'
import { getHost } from '../api/hosts'
import { getHostClassById, getHostClasses, FulfillmentHostClass, HostClass } from '../api/host-classes'
import { logger } from '@/utils/logger'

// Mock networking data for demo
const mockNetworking: Record<string, unknown> = {
  default: {
    vlan: 'VLAN 100',
    imex_channel: 'NVL72 Channel 3',
    ib_slot: 'IB Slot 7-8',
    topology: 'Full mesh NVLink between GPUs on same node',
  },
}

const ClusterDetail: React.FC = () => {
  const { t } = useTranslation(['clusters', 'navigation'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cluster, setCluster] = useState<Cluster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0)
  const [password, setPassword] = useState<string>('')
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [usingPrivateApi, setUsingPrivateApi] = useState(false)
  const [alerts, setAlerts] = useState<Array<{ key: number; title: string }>>([])
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [hostsData, setHostsData] = useState<Record<string, Host>>({})
  const [hostClassesData, setHostClassesData] = useState<Record<string, FulfillmentHostClass>>({})
  const [staticHostClasses, setStaticHostClasses] = useState<Record<string, HostClass>>({})
  const [loadingHosts, setLoadingHosts] = useState(false)
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false)
  const [scaleSize, setScaleSize] = useState('')
  const [scalingSizeError, setScalingSizeError] = useState('')
  const [isScaling, setIsScaling] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const addAlert = (title: string) => {
    const key = Date.now()
    setAlerts((prevAlerts) => [...prevAlerts, { key, title }])
    setTimeout(() => {
      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.key !== key))
    }, 3000)
  }

  const copyPassword = () => {
    if (password) {
      navigator.clipboard.writeText(password).then(() => {
        addAlert('Password copied to clipboard')
      }).catch((err) => {
        logger.error('Failed to copy password', err)
        addAlert('Failed to copy password')
      })
    }
  }

  const downloadKubeconfig = async () => {
    if (!id) return

    try {
      addAlert('Downloading kubeconfig...')
      const kubeconfigContent = await getClusterKubeconfig(id)

      // Create a blob and download it
      const blob = new Blob([kubeconfigContent], { type: 'text/yaml' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cluster?.metadata?.name || cluster?.id}-kubeconfig.yaml`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addAlert('Kubeconfig downloaded successfully')
    } catch (err: unknown) {
      logger.error('Failed to download kubeconfig', err)
      addAlert('Failed to download kubeconfig')
    }
  }

  const openDeleteModal = () => {
    setDeleteConfirmation('')
    setIsDeleteModalOpen(true)
  }

  const handleDeleteCluster = async () => {
    if (!cluster || !id) return

    const clusterName = cluster.metadata?.name || cluster.id.substring(0, 12)
    if (deleteConfirmation !== clusterName) {
      return
    }

    try {
      setIsDeleting(true)

      await deleteCluster(id)

      addAlert('Cluster deleted successfully')

      // Navigate back to clusters list after a brief delay
      setTimeout(() => {
        navigate('/admin/clusters')
      }, 1500)
    } catch (err: unknown) {
      logger.error('Failed to delete cluster', err)
      addAlert('Failed to delete cluster')
      setIsDeleting(false)
    }
  }

  const openScaleModal = () => {
    if (cluster?.status?.node_sets && Object.keys(cluster.status.node_sets).length > 0) {
      const firstNodeSet = Object.values(cluster.status.node_sets)[0]
      setScaleSize(String(firstNodeSet.size || 1))
      setScalingSizeError('')
      setIsScaleModalOpen(true)
    }
  }

  const handleScaleCluster = async () => {
    if (!cluster || !id) return

    const newSize = parseInt(scaleSize, 10)
    if (isNaN(newSize) || newSize < 1) {
      setScalingSizeError('Size must be a number greater than or equal to 1')
      return
    }

    const nodeSets = cluster.status?.node_sets || cluster.spec?.node_sets
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

      await scaleCluster(id, nodeSetName, newSize, hostClass)

      const action = newSize > currentSize ? 'up' : 'down'
      addAlert(`Cluster scaled ${action} from ${currentSize} to ${newSize} nodes`)

      setIsScaleModalOpen(false)
      setScaleSize('')

      loadCluster()
    } catch (err: unknown) {
      logger.error('Failed to scale cluster', err)
      setScalingSizeError((err as { message?: string })?.message || 'Failed to scale cluster')
    } finally {
      setIsScaling(false)
    }
  }

  const checkAdminStatus = async () => {
    try {
      const userManager = getUserManager()
      const user = await userManager.getUser()
      const roles = user?.profile?.roles as string[] | undefined
      const admin = roles?.includes('fulfillment-admin') || false
      setUsingPrivateApi(admin)
    } catch (err) {
      logger.error('Failed to check admin status', err)
    }
  }

  const loadCluster = useCallback(async (isBackgroundRefresh = false) => {
    if (!id) return

    try {
      // Only show loading spinner on initial load, not on background refreshes
      if (!isBackgroundRefresh) {
        setLoading(true)
      }
      setError(null)
      const clusterData = await getCluster(id)
      setCluster(clusterData)
      // Load hosts data in the background only if we don't have it yet or if nodes changed
      if (!isBackgroundRefresh || (cluster?.status?.node_sets &&
          JSON.stringify(cluster.status.node_sets) !== JSON.stringify(clusterData.status?.node_sets))) {
        loadHostsData(clusterData)
      }
    } catch (err: unknown) {
      logger.error('Failed to load cluster', err)
      const error = err as { message?: string }
      if (!isBackgroundRefresh) {
        setError((error as { message?: string })?.message || 'Failed to load cluster')
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false)
      }
    }
  }, [id, cluster?.status?.node_sets])

  const loadPassword = useCallback(async () => {
    if (!id) return

    try {
      setLoadingPassword(true)
      const pwd = await getClusterPassword(id)
      setPassword(pwd)
    } catch (err: unknown) {
      logger.error('Failed to load password', err)
    } finally {
      setLoadingPassword(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      checkAdminStatus()
      loadCluster()
      loadPassword()

      // Poll for updates every 10 seconds
      const interval = setInterval(() => {
        loadCluster(true) // Pass true to indicate this is a background refresh
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [id, loadCluster, loadPassword])

  const loadHostsData = async (clusterData: Cluster) => {
    if (!clusterData.status?.node_sets) return

    try {
      setLoadingHosts(true)
      const hostsMap: Record<string, Host> = {}
      const hostClassesMap: Record<string, FulfillmentHostClass> = {}
      const hostClassIds = new Set<string>()

      // Fetch static host classes catalog
      const staticClasses = await getHostClasses()
      setStaticHostClasses(staticClasses)

      // Collect all host IDs and host class IDs
      for (const [, nodeSet] of Object.entries(clusterData.status.node_sets)) {
        if (nodeSet.hosts) {
          for (const hostId of nodeSet.hosts) {
            const host = await getHost(hostId)
            hostsMap[hostId] = host
            if (host.spec?.class) {
              hostClassIds.add(host.spec.class)
            }
          }
        }
      }

      // Fetch all unique host classes
      for (const hostClassId of hostClassIds) {
        const hostClass = await getHostClassById(hostClassId)
        hostClassesMap[hostClassId] = hostClass
      }

      setHostsData(hostsMap)
      setHostClassesData(hostClassesMap)
    } catch (err: unknown) {
      logger.error('Failed to load hosts data', err)
    } finally {
      setLoadingHosts(false)
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

  if (loading) {
    return (
      <AppLayout>
        <PageSection>
          <Spinner size="xl" />
        </PageSection>
      </AppLayout>
    )
  }

  if (error || !cluster) {
    return (
      <AppLayout>
        <PageSection>
          <Alert variant="danger" title="Error">
            {error || 'Cluster not found'}
          </Alert>
          <Button variant="primary" onClick={() => navigate('/admin/clusters')} style={{ marginTop: '1rem' }}>
            Back to Clusters
          </Button>
        </PageSection>
      </AppLayout>
    )
  }

  const networking = (mockNetworking[cluster.id] || mockNetworking.default) as {
    vlan?: string
    imex_channel?: string
    ib_slot?: string
    topology?: string
  }

  return (
    <AppLayout>
      <AlertGroup isToast isLiveRegion>
        {alerts.map((alert) => (
          <Alert
            key={alert.key}
            variant={AlertVariant.success}
            title={alert.title}
            timeout={3000}
            actionClose={
              <AlertActionCloseButton
                onClose={() => setAlerts((prev) => prev.filter((a) => a.key !== alert.key))}
              />
            }
          />
        ))}
      </AlertGroup>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem to="/admin/clusters" onClick={(e) => { e.preventDefault(); navigate('/admin/clusters'); }}>
            {t('clusters:detail.breadcrumb')}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{cluster.id.substring(0, 8)}</BreadcrumbItem>
        </Breadcrumb>
        <Flex alignItems={{ default: 'alignItemsCenter' }} style={{ marginTop: '1rem' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">
              Cluster: {cluster.metadata?.name || cluster.id.substring(0, 8)}
            </Title>
          </FlexItem>
          <FlexItem>
            <Dropdown
              isOpen={isActionsOpen}
              onSelect={() => setIsActionsOpen(false)}
              onOpenChange={setIsActionsOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                  isExpanded={isActionsOpen}
                >
                  Actions
                </MenuToggle>
              )}
            >
              <DropdownList>
                <DropdownItem
                  key="download-kubeconfig"
                  onClick={downloadKubeconfig}
                  icon={<DownloadIcon />}
                >
                  {t('clusters:detail.actions.downloadKubeconfig')}
                </DropdownItem>
                <DropdownItem
                  key="scale-cluster"
                  onClick={openScaleModal}
                  icon={<PlusCircleIcon />}
                >
                  {t('clusters:detail.actions.scaleCluster')}
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  onClick={openDeleteModal}
                  icon={<TrashIcon />}
                  style={{ color: 'var(--pf-v5-global--danger-color--100)' }}
                >
                  {t('clusters:detail.actions.delete')}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Tabs activeKey={activeTabKey} onSelect={(_, key) => setActiveTabKey(key)}>
          {/* Overview Tab */}
          <Tab eventKey={0} title={<TabTitleText>{t('clusters:detail.tabs.overview')}</TabTitleText>}>
            <Card>
              <CardBody>
                {!loadingPassword && !password && cluster.status?.state !== ClusterState.READY && (
                  <Alert variant="info" title="Cluster credentials pending" isInline style={{ marginBottom: '1rem' }}>
                    Cluster credentials will be available after the installation completes. Please check back once the cluster state is READY.
                  </Alert>
                )}
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Cluster ID</DescriptionListTerm>
                    <DescriptionListDescription>{cluster.id}</DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Name</DescriptionListTerm>
                    <DescriptionListDescription>
                      {cluster.metadata?.name || '-'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>State</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Label color={getStateBadgeColor(cluster.status?.state)}>
                        {cluster.status?.state?.replace('CLUSTER_STATE_', '') || 'UNKNOWN'}
                      </Label>
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Template</DescriptionListTerm>
                    <DescriptionListDescription>
                      {cluster.spec?.template || '-'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>API URL</DescriptionListTerm>
                    <DescriptionListDescription>
                      {cluster.status?.api_url || '-'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Console URL</DescriptionListTerm>
                    <DescriptionListDescription>
                      {cluster.status?.console_url ? (
                        <a href={cluster.status.console_url} target="_blank" rel="noopener noreferrer">
                          {cluster.status.console_url} <ExternalLinkAltIcon style={{ marginLeft: '0.25rem' }} />
                        </a>
                      ) : (
                        '-'
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {!loadingPassword && password && (
                    <>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Username</DescriptionListTerm>
                        <DescriptionListDescription>
                          kubeadmin
                        </DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Password</DescriptionListTerm>
                        <DescriptionListDescription>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="password"
                              value={password}
                              readOnly
                              style={{
                                border: '1px solid var(--pf-v5-global--BorderColor--100)',
                                padding: '0.375rem 0.5rem',
                                borderRadius: '3px',
                                backgroundColor: 'var(--pf-v5-global--BackgroundColor--100)',
                                color: 'var(--pf-v5-global--Color--100)',
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                width: '200px',
                              }}
                            />
                            <Button
                              variant="plain"
                              aria-label="Copy password"
                              onClick={copyPassword}
                              icon={<CopyIcon />}
                            />
                          </div>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </>
                  )}

                  <DescriptionListGroup>
                    <DescriptionListTerm>Created At</DescriptionListTerm>
                    <DescriptionListDescription>
                      {cluster.metadata?.creation_timestamp
                        ? new Date(cluster.metadata.creation_timestamp).toLocaleString()
                        : '-'
                      }
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {cluster.metadata?.creators && cluster.metadata.creators.length > 0 && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Created By</DescriptionListTerm>
                      <DescriptionListDescription>
                        {cluster.metadata.creators.join(', ')}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}

                  {usingPrivateApi && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>API Mode</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Label color="blue">Private API (Admin)</Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                </DescriptionList>
              </CardBody>
            </Card>
          </Tab>

          {/* Nodes Tab */}
          <Tab eventKey={1} title={<TabTitleText>{t('clusters:detail.tabs.nodes')}</TabTitleText>}>
            <Card>
              <CardBody>
                <h3>Hosts</h3>
                {/* Show status message if spec and status differ */}
                {cluster.spec?.node_sets && cluster.status?.node_sets && cluster.status.node_sets && (
                  Object.entries(cluster.spec.node_sets).map(([nodeSetName, specNodeSet]) => {
                    const statusNodeSet = cluster.status?.node_sets?.[nodeSetName]
                    if (statusNodeSet && specNodeSet.size !== statusNodeSet.size) {
                      // Check if this is scaling (both sizes > 0) or initial provisioning (status.size === 0)
                      const currentSize = statusNodeSet.size || 0
                      const isScaling = currentSize > 0
                      const message = isScaling
                        ? `Scaling in progress: Node set "${nodeSetName}" is being scaled from ${currentSize} to ${specNodeSet.size} nodes`
                        : `Provisioning nodes: Node set "${nodeSetName}" is being provisioned with ${specNodeSet.size} ${specNodeSet.size === 1 ? 'node' : 'nodes'}`

                      return (
                        <div key={nodeSetName} style={{
                          padding: '1rem',
                          marginBottom: '1rem',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '4px',
                          border: '1px solid #d2d2d2'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Spinner size="md" />
                            <span>
                              <strong>{isScaling ? 'Scaling in progress:' : 'Provisioning nodes:'}</strong> {message.split(': ')[1]}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })
                )}
                {loadingHosts ? (
                  <Spinner size="md" />
                ) : cluster.status?.node_sets && Object.keys(cluster.status.node_sets).length > 0 ? (
                  <Table variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Host</Th>
                        <Th>Host Class</Th>
                        <Th>CPU Type</Th>
                        <Th>CPU Cores</Th>
                        <Th>RAM Size</Th>
                        <Th>GPU Model</Th>
                        <Th>GPU Count</Th>
                        <Th>Node Set</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {Object.entries(cluster.status.node_sets).flatMap(([nodeSetName, nodeSet]) =>
                        (nodeSet.hosts || []).map((hostId) => {
                          const host = hostsData[hostId]
                          const hostClassId = host?.spec?.class || nodeSet.host_class
                          const fulfillmentClass = hostClassId ? hostClassesData[hostClassId] : null
                          const className = fulfillmentClass?.metadata?.name
                          const staticClass = className ? staticHostClasses[className] : null

                          return (
                            <Tr key={hostId}>
                              <Td>
                                <Button
                                  variant="link"
                                  isInline
                                  onClick={() => navigate(`/bare-metal-hosts/${hostId}`)}
                                  style={{ padding: 0, fontSize: 'inherit', color: '#0066cc' }}
                                >
                                  {host?.metadata?.name || hostId.substring(0, 12)}
                                </Button>
                              </Td>
                              <Td>
                                {staticClass ? (
                                  <div>
                                    <strong>{staticClass.name || '-'}</strong>
                                    {staticClass.description && (
                                      <div style={{ fontSize: '0.9em', color: '#6a6e73' }}>
                                        {staticClass.description}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  fulfillmentClass?.metadata?.name || fulfillmentClass?.title || hostClassId?.substring(0, 12) || '-'
                                )}
                              </Td>
                              <Td>{staticClass?.cpu?.type || '-'}</Td>
                              <Td>{staticClass?.cpu ? (staticClass.cpu.cores * staticClass.cpu.sockets) : '-'}</Td>
                              <Td>{staticClass?.ram?.size || '-'}</Td>
                              <Td>
                                {staticClass?.gpu?.model ? (
                                  <Label color="purple" style={{ fontSize: '0.875rem' }}>
                                    {staticClass.gpu.model}
                                  </Label>
                                ) : '-'}
                              </Td>
                              <Td>{staticClass?.gpu?.count || '-'}</Td>
                              <Td>{nodeSetName}</Td>
                            </Tr>
                          )
                        })
                      )}
                    </Tbody>
                  </Table>
                ) : (
                  <p>No hosts configured</p>
                )}
              </CardBody>
            </Card>
          </Tab>

          {/* Conditions Tab */}
          <Tab eventKey={2} title={<TabTitleText>{t('clusters:detail.tabs.conditions')}</TabTitleText>}>
            <Card>
              <CardBody>
                {cluster.status?.conditions && cluster.status.conditions.length > 0 ? (
                  <Table variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Type</Th>
                        <Th>Status</Th>
                        <Th>Reason</Th>
                        <Th>Message</Th>
                        <Th>Last Transition</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cluster.status.conditions.map((condition, idx) => (
                        <Tr key={idx}>
                          <Td>{condition.type || '-'}</Td>
                          <Td>
                            <Label color={condition.status?.includes('TRUE') ? 'green' : 'grey'}>
                              {condition.status?.replace('CONDITION_STATUS_', '') || 'UNKNOWN'}
                            </Label>
                          </Td>
                          <Td>{condition.reason || '-'}</Td>
                          <Td>{condition.message || '-'}</Td>
                          <Td>
                            {condition.last_transition_time
                              ? new Date(condition.last_transition_time).toLocaleString()
                              : '-'
                            }
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <p>No conditions available</p>
                )}
              </CardBody>
            </Card>
          </Tab>

          {/* Networking Tab (Mock) */}
          <Tab eventKey={3} title={<TabTitleText>{t('clusters:detail.tabs.networking')}</TabTitleText>}>
            <Card>
              <CardBody>
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Allocated VLAN</DescriptionListTerm>
                    <DescriptionListDescription>{networking.vlan}</DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>IMEx/NVLink Channel</DescriptionListTerm>
                    <DescriptionListDescription>{networking.imex_channel}</DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>IB Slot</DescriptionListTerm>
                    <DescriptionListDescription>{networking.ib_slot}</DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Topology</DescriptionListTerm>
                    <DescriptionListDescription>{networking.topology}</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>

                <Alert variant="info" title="Demo Mode" isInline style={{ marginTop: '1rem' }}>
                  Network visualization values are mocked for demo purposes.
                </Alert>
              </CardBody>
            </Card>
          </Tab>
        </Tabs>
      </PageSection>

      <Modal
        variant={ModalVariant.small}
        title={`Scale cluster ${cluster?.metadata?.name || ''}`}
        isOpen={isScaleModalOpen}
        onClose={() => {
          setIsScaleModalOpen(false)
          setScaleSize('')
          setScalingSizeError('')
        }}
      >
        <div style={{ padding: '0' }}>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            padding: '1.5rem 1.5rem 1rem 1.5rem',
            color: '#151515'
          }}>
            Scale cluster {cluster?.metadata?.name || ''}
          </div>
          {cluster?.status?.node_sets && Object.keys(cluster.status.node_sets).length > 0 && (() => {
            const nodeSet = Object.values(cluster.status.node_sets)[0]
            const hostClassId = nodeSet.host_class
            const fulfillmentClass = hostClassId ? hostClassesData[hostClassId] : null
            const className = fulfillmentClass?.metadata?.name
            const staticClass = className ? staticHostClasses[className] : null

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
                      <div>{staticClass.cpu ? (staticClass.cpu.cores * staticClass.cpu.sockets) : '-'}</div>

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
              Please type <strong>{cluster?.metadata?.name || cluster?.id.substring(0, 12)}</strong> to confirm deletion.
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
                placeholder={cluster?.metadata?.name || cluster?.id.substring(0, 12)}
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
                  deleteConfirmation !== (cluster?.metadata?.name || cluster?.id.substring(0, 12))
                }
                isLoading={isDeleting}
              >
                {isDeleting ? 'Deleting cluster...' : 'Delete cluster'}
              </Button>
              <Button
                variant="link"
                onClick={() => {
                  setIsDeleteModalOpen(false)
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

export default ClusterDetail
