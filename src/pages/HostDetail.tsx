import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  Tabs,
  Tab,
  TabTitleText,
  Spinner,
  Label,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Alert,
  Flex,
  FlexItem,
  Button,
} from '@patternfly/react-core'
import { ServerIcon, ExternalLinkAltIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import yaml from 'js-yaml'
import AppLayout from '../components/layouts/AppLayout'
import { getHost } from '../api/hosts'
import { Host } from '../api/types'
import { getHostClasses, getHostClassById, HostClass } from '../api/host-classes'
import { logger } from '@/utils/logger'

const HostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation(['bareMetalHosts'])
  const [host, setHost] = useState<Host | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0)
  const [hostClass, setHostClass] = useState<HostClass | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showBcmPassword, setShowBcmPassword] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      try {
        // Only show loading spinner on first load, not on auto-refresh
        if (isFirstLoad) {
          setLoading(true)
        }

        // Step 1: Get host data (contains class UUID in spec.class)
        const hostData = await getHost(id)
        setHost(hostData)

        // Step 2: Get static host classes catalog (keyed by name)
        const hostClassesData = await getHostClasses()

        // Step 3: Get fulfillment class data by UUID and match to static catalog
        if (hostData.spec?.class) {
          try {
            const fulfillmentClass = await getHostClassById(hostData.spec.class)
            const className = fulfillmentClass.metadata?.name

            if (className && hostClassesData[className]) {
              setHostClass(hostClassesData[className])
            } else {
              logger.warn(`Host class name "${className}" not found in static catalog`)
              setHostClass(null)
            }
          } catch (err) {
            logger.error('Error fetching host class from fulfillment API', err)
            setHostClass(null)
          }
        } else {
          setHostClass(null)
        }

        setError(null)
      } catch (err) {
        logger.error('Error fetching host', err)
        setError('Failed to load host details')
      } finally {
        // Update loading state and mark first load complete
        setLoading(false)
        if (isFirstLoad) {
          setIsFirstLoad(false)
        }
      }
    }

    fetchData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [id, isFirstLoad])

  const getPowerStateBadge = (powerState?: string) => {
    if (!powerState) return <Label color="grey">Unknown</Label>

    const normalizedState = powerState.toUpperCase()

    if (normalizedState.includes('ON') || normalizedState.includes('RUNNING')) {
      return <Label color="green">On</Label>
    } else if (normalizedState.includes('OFF')) {
      return <Label color="red">Off</Label>
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

  if (loading) {
    return (
      <AppLayout>
        <PageSection>
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Spinner size="xl" />
            <p style={{ marginTop: '1rem', color: '#6a6e73' }}>Loading host details...</p>
          </div>
        </PageSection>
      </AppLayout>
    )
  }

  if (error || !host) {
    return (
      <AppLayout>
        <PageSection>
          <Alert variant="danger" title="Error loading host">
            {error || 'Host not found'}
          </Alert>
        </PageSection>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageSection>
        <Breadcrumb style={{ marginBottom: '1rem' }}>
          <BreadcrumbItem to="/bare-metal-hosts" onClick={(e) => { e.preventDefault(); navigate('/bare-metal-hosts') }}>
            {t('bareMetalHosts:detail.breadcrumb')}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{host.metadata?.name || host.id}</BreadcrumbItem>
        </Breadcrumb>

        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }} style={{ marginBottom: '1.5rem' }}>
          <FlexItem>
            <div style={{ fontSize: '2.5rem', color: '#6a6e73' }}>
              <ServerIcon />
            </div>
          </FlexItem>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">
              {host.metadata?.name || host.id}
            </Title>
          </FlexItem>
          <FlexItem>
            {getPowerStateBadge(host.status?.power_state)}
          </FlexItem>
        </Flex>

        <Grid hasGutter>
          <GridItem span={12}>
            <Card>
              <Tabs
                activeKey={activeTabKey}
                onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}
              >
                <Tab eventKey={0} title={<TabTitleText>{t('bareMetalHosts:detail.tabs.details')}</TabTitleText>}>
                  <CardBody>
                    {/* General Host Information */}
                    <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Host ID</DescriptionListTerm>
                        <DescriptionListDescription>
                          <code>{host.id}</code>
                        </DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Name</DescriptionListTerm>
                        <DescriptionListDescription>{host.metadata?.name || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Power State</DescriptionListTerm>
                        <DescriptionListDescription>{getPowerStateBadge(host.status?.power_state)}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>State</DescriptionListTerm>
                        <DescriptionListDescription>{host.status?.state || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Host Pool</DescriptionListTerm>
                        <DescriptionListDescription>{host.status?.host_pool || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Cluster</DescriptionListTerm>
                        <DescriptionListDescription>
                          {host.status?.cluster ? (
                            <Link to={`/admin/clusters/${host.status.cluster}`} style={{ color: '#06c' }}>
                              {host.status.cluster} <ExternalLinkAltIcon style={{ fontSize: '0.75rem' }} />
                            </Link>
                          ) : 'N/A'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Rack</DescriptionListTerm>
                        <DescriptionListDescription>{host.spec?.rack || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Boot IP</DescriptionListTerm>
                        <DescriptionListDescription>{host.spec?.boot_ip || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Boot MAC</DescriptionListTerm>
                        <DescriptionListDescription>{host.spec?.boot_mac || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Created</DescriptionListTerm>
                        <DescriptionListDescription>{formatTimestamp(host.metadata?.creation_timestamp)}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Tenants</DescriptionListTerm>
                        <DescriptionListDescription>
                          {host.metadata?.tenants && host.metadata.tenants.length > 0
                            ? host.metadata.tenants.map(tenant => (
                                <Label key={tenant} color="blue" style={{ marginRight: '0.5rem' }}>
                                  {tenant}
                                </Label>
                              ))
                            : 'N/A'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>

                      {host.metadata?.creators && host.metadata.creators.length > 0 && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>Created By</DescriptionListTerm>
                          <DescriptionListDescription>
                            {host.metadata.creators.join(', ')}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      )}
                    </DescriptionList>

                    {/* BCM Configuration Section */}
                    {host.spec?.bcm_link && (
                      <>
                        <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #d2d2d2' }} />
                        <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>
                          BCM Configuration
                        </Title>
                        <DescriptionList isHorizontal columnModifier={{ default: '1Col' }}>
                          <DescriptionListGroup>
                            <DescriptionListTerm>BCM Node</DescriptionListTerm>
                            <DescriptionListDescription>
                              <a href={host.spec.bcm_link} target="_blank" rel="noopener noreferrer" style={{ color: '#06c' }}>
                                {(() => {
                                  // Extract node ID from URL like: https://bcm.service.demo:8081/base-view/device/5d0ac70b-0b46-4338-9003-3d785d46b7e4
                                  const match = host.spec.bcm_link.match(/\/device\/([a-f0-9-]+)/i)
                                  return match ? match[1] : host.spec.bcm_link
                                })()} <ExternalLinkAltIcon style={{ fontSize: '0.75rem' }} />
                              </a>
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>

                        <DescriptionList isHorizontal columnModifier={{ default: '2Col' }} style={{ marginTop: '1rem' }}>
                          <DescriptionListGroup>
                            <DescriptionListTerm>BCM User</DescriptionListTerm>
                            <DescriptionListDescription>
                              <code>root</code>
                            </DescriptionListDescription>
                          </DescriptionListGroup>

                          <DescriptionListGroup>
                            <DescriptionListTerm>BCM Password</DescriptionListTerm>
                            <DescriptionListDescription>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type={showBcmPassword ? 'text' : 'password'}
                                  value="redhat123"
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
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setShowBcmPassword(!showBcmPassword)}
                                >
                                  {showBcmPassword ? 'Hide' : 'Show'}
                                </Button>
                              </div>
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>
                      </>
                    )}
                  </CardBody>
                </Tab>

                <Tab eventKey={1} title={<TabTitleText>{t('bareMetalHosts:detail.tabs.hardware')}</TabTitleText>}>
                  <CardBody>
                    {hostClass ? (
                      <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Host Class</DescriptionListTerm>
                          <DescriptionListDescription>
                            {hostClass.name || 'N/A'}
                            {hostClass.description && (
                              <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#6a6e73' }}>
                                {hostClass.description}
                              </div>
                            )}
                          </DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                          <DescriptionListTerm>Category</DescriptionListTerm>
                          <DescriptionListDescription>{hostClass.category || 'N/A'}</DescriptionListDescription>
                        </DescriptionListGroup>

                        {hostClass.cpu && (
                          <>
                            <DescriptionListGroup>
                              <DescriptionListTerm>CPU Type</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.cpu.type || 'N/A'}</DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>CPU Cores</DescriptionListTerm>
                              <DescriptionListDescription>
                                {hostClass.cpu.cores || 0} cores × {hostClass.cpu.sockets || 0} sockets ({(hostClass.cpu.cores || 0) * (hostClass.cpu.sockets || 0)} total)
                              </DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>CPU Threads</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.cpu.threadsPerCore || 0} per core</DescriptionListDescription>
                            </DescriptionListGroup>
                          </>
                        )}

                        {hostClass.ram && (
                          <>
                            <DescriptionListGroup>
                              <DescriptionListTerm>RAM Size</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.ram.size || 'N/A'}</DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>RAM Type</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.ram.type || 'N/A'}</DescriptionListDescription>
                            </DescriptionListGroup>
                          </>
                        )}

                        {hostClass.disk && (
                          <>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Disk Type</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.disk.type || 'N/A'}</DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>Disk Size</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.disk.size || 'N/A'}</DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>Disk Interface</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.disk.interface || 'N/A'}</DescriptionListDescription>
                            </DescriptionListGroup>
                          </>
                        )}

                        {hostClass.gpu && (
                          <>
                            <DescriptionListGroup>
                              <DescriptionListTerm>GPU Model</DescriptionListTerm>
                              <DescriptionListDescription>
                                <Label color="purple" style={{ fontSize: '0.875rem' }}>
                                  {hostClass.gpu.model || 'N/A'}
                                </Label>
                              </DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>GPU Count</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.gpu.count || 0}</DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>GPU Memory</DescriptionListTerm>
                              <DescriptionListDescription>{hostClass.gpu.memory || 'N/A'}</DescriptionListDescription>
                            </DescriptionListGroup>
                          </>
                        )}
                      </DescriptionList>
                    ) : (
                      <p style={{ color: '#6a6e73' }}>No hardware specifications available</p>
                    )}

                    {/* BMC Configuration Section */}
                    {host.spec?.bmc && (
                      <>
                        <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #d2d2d2' }} />
                        <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>
                          BMC Configuration
                        </Title>
                        <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
                          {host.spec?.bmc?.url && (
                            <DescriptionListGroup>
                              <DescriptionListTerm>BMC URL</DescriptionListTerm>
                              <DescriptionListDescription>
                                <code style={{ wordBreak: 'break-all' }}>{host.spec.bmc.url}</code>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          )}

                          {host.spec?.bmc?.user && (
                            <DescriptionListGroup>
                              <DescriptionListTerm>BMC User</DescriptionListTerm>
                              <DescriptionListDescription>
                                <code>{host.spec.bmc.user}</code>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          )}

                          {host.spec?.bmc?.password && (
                            <DescriptionListGroup>
                              <DescriptionListTerm>BMC Password</DescriptionListTerm>
                              <DescriptionListDescription>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={host.spec.bmc.password}
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
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? 'Hide' : 'Show'}
                                  </Button>
                                </div>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          )}

                          {host.spec?.bmc?.insecure !== undefined && (
                            <DescriptionListGroup>
                              <DescriptionListTerm>Insecure</DescriptionListTerm>
                              <DescriptionListDescription>
                                <Label color={host.spec.bmc.insecure ? 'orange' : 'green'}>
                                  {host.spec.bmc.insecure ? 'Yes (Skip TLS Verification)' : 'No (TLS Verified)'}
                                </Label>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          )}
                        </DescriptionList>
                      </>
                    )}
                  </CardBody>
                </Tab>

                <Tab eventKey={2} title={<TabTitleText>{t('bareMetalHosts:detail.tabs.networking')}</TabTitleText>}>
                  <CardBody>
                    <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Boot IP</DescriptionListTerm>
                        <DescriptionListDescription>
                          <code>{host.spec?.boot_ip || 'N/A'}</code>
                        </DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Boot MAC</DescriptionListTerm>
                        <DescriptionListDescription>
                          <code>{host.spec?.boot_mac || 'N/A'}</code>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>

                    <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #d2d2d2' }} />
                    <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>
                      Network Configuration (Mock)
                    </Title>
                    <p style={{ color: '#6a6e73', marginBottom: '1rem' }}>
                      Network configuration details will be displayed here when available.
                    </p>
                  </CardBody>
                </Tab>

                <Tab eventKey={3} title={<TabTitleText>{t('bareMetalHosts:detail.tabs.yaml')}</TabTitleText>}>
                  <CardBody>
                    <pre style={{
                      background: '#f5f5f5',
                      padding: '1rem',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '600px'
                    }}>
                      {host && typeof host === 'object' && host.id
                        ? yaml.dump(host, { indent: 2, noRefs: true })
                        : 'Error: Invalid host data'}
                    </pre>
                  </CardBody>
                </Tab>
              </Tabs>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </AppLayout>
  )
}

export default HostDetail
