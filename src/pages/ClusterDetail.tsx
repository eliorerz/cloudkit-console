import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
} from '@patternfly/react-core'
import { ExternalLinkAltIcon, CopyIcon, DownloadIcon, PlusCircleIcon, TrashIcon } from '@patternfly/react-icons'
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table'
import AppLayout from '../components/layouts/AppLayout'
import { getCluster, getClusterPassword, getClusterKubeconfig } from '../api/clustersApi'
import { Cluster, ClusterState, Host } from '../api/types'
import { getUserManager } from '../auth/oidcConfig'
import { getHost } from '../api/hosts'
import { getHostClassById, getHostClasses, FulfillmentHostClass, HostClass } from '../api/host-classes'

// Mock networking data for demo
const mockNetworking: Record<string, any> = {
  default: {
    vlan: 'VLAN 100',
    imex_channel: 'NVL72 Channel 3',
    ib_slot: 'IB Slot 7-8',
    topology: 'Full mesh NVLink between GPUs on same node',
  },
}

const ClusterDetail: React.FC = () => {
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
        console.error('Failed to copy password:', err)
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
    } catch (err: any) {
      console.error('Failed to download kubeconfig:', err)
      addAlert('Failed to download kubeconfig')
    }
  }

  const deleteCluster = () => {
    addAlert('Delete cluster feature not yet implemented')
  }

  useEffect(() => {
    if (id) {
      checkAdminStatus()
      loadCluster()
      loadPassword()
    }
  }, [id])

  const checkAdminStatus = async () => {
    try {
      const userManager = getUserManager()
      const user = await userManager.getUser()
      const roles = user?.profile?.roles as string[] | undefined
      const admin = roles?.includes('fulfillment-admin') || false
      setUsingPrivateApi(admin)
    } catch (err) {
      console.error('Failed to check admin status:', err)
    }
  }

  const loadCluster = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const clusterData = await getCluster(id)
      setCluster(clusterData)
      // Load hosts data in the background
      loadHostsData(clusterData)
    } catch (err: any) {
      console.error('Failed to load cluster:', err)
      setError(err.message || 'Failed to load cluster')
    } finally {
      setLoading(false)
    }
  }

  const loadPassword = async () => {
    if (!id) return

    try {
      setLoadingPassword(true)
      const pwd = await getClusterPassword(id)
      setPassword(pwd)
    } catch (err: any) {
      console.error('Failed to load password:', err)
    } finally {
      setLoadingPassword(false)
    }
  }

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
    } catch (err: any) {
      console.error('Failed to load hosts data:', err)
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

  const networking = mockNetworking[cluster.id] || mockNetworking.default

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
            Clusters
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
                  Download Kubeconfig
                </DropdownItem>
                <DropdownItem
                  key="scale-cluster"
                  icon={<PlusCircleIcon />}
                >
                  Scale Cluster
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  onClick={deleteCluster}
                  icon={<TrashIcon />}
                  style={{
                    backgroundColor: 'var(--pf-v5-global--danger-color--100)',
                    color: 'white'
                  }}
                >
                  Delete
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Tabs activeKey={activeTabKey} onSelect={(_, key) => setActiveTabKey(key)}>
          {/* Overview Tab */}
          <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
            <Card>
              <CardBody>
                {!loadingPassword && !password && (
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
          <Tab eventKey={1} title={<TabTitleText>Nodes</TabTitleText>}>
            <Card>
              <CardBody>
                <h3>Hosts</h3>
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
          <Tab eventKey={2} title={<TabTitleText>Conditions</TabTitleText>}>
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
          <Tab eventKey={3} title={<TabTitleText>Networking (Mock)</TabTitleText>}>
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
    </AppLayout>
  )
}

export default ClusterDetail
