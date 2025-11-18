import { useEffect, useState } from 'react'
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
  List,
  ListItem,
  Label,
  Grid,
  GridItem,
} from '@patternfly/react-core'
import {
  LayerGroupIcon,
  NetworkIcon,
  VirtualMachineIcon,
  ProcessAutomationIcon,
  ChartLineIcon,
  ClockIcon
} from '@patternfly/react-icons'
import { getDashboardMetrics } from '../api/dashboard'
import { DashboardMetrics } from '../api/types'
import AppLayout from '../components/layouts/AppLayout'
import { useAuth } from '../contexts/AuthContext'

const Dashboard: React.FC = () => {
  const { role } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    templates: { total: 0 },
    hubs: { total: 0 },
    vms: { total: 0, running: 0, stopped: 0, error: 0, provisioning: 0 },
    operations: { active: 0, provisioning: 0, deprovisioning: 0 },
    recentActivity: { vmsCreatedLast24h: 0, vmsCreatedLast7d: 0 },
    resources: { cpuUtilization: 0, memoryUtilization: 0, storageUtilization: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      if (isInitialLoad) {
        setLoading(true)
      }
      const data = await getDashboardMetrics()

      // Exclude generic template from count for non-admin users
      // The backend counts all templates including the generic one
      // For non-admin users, subtract 1 (the generic template) or set to 0 if only generic exists
      if (role !== 'fulfillment-admin' && data.templates.total > 0) {
        data.templates.total = Math.max(0, data.templates.total - 1)
      }

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
            <GridItem sm={12} md={12} lg={9} xl={9} rowSpan={1}>
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

          <GalleryItem>
            <Card isFullHeight>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <span style={{ color: '#3e8635', fontSize: '1.5rem' }}>
                      <ChartLineIcon />
                    </span>
                  </FlexItem>
                  <FlexItem>
                    Resource Utilization
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <strong>CPU:</strong> {metrics.resources.cpuUtilization}%
                </div>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <strong>Memory:</strong> {metrics.resources.memoryUtilization}%
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  <strong>Storage:</strong> {metrics.resources.storageUtilization}%
                </div>
              </CardBody>
            </Card>
          </GalleryItem>
              </Gallery>
            </GridItem>

            <GridItem sm={12} md={12} lg={3} xl={3} rowSpan={2}>
              <Card style={{ height: '100%' }}>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <ProcessAutomationIcon style={{ marginRight: '0.5rem', color: '#009596' }} />
                    </FlexItem>
                    <FlexItem>
                      Active Operations
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  {metrics.operations.active === 0 ? (
                    <div style={{ color: '#6a6e73', fontStyle: 'italic', padding: '1rem 0' }}>
                      No active operations
                    </div>
                  ) : (
                    <List isPlain>
                      {metrics.operations.provisioning > 0 && (
                        <ListItem>
                          <Flex alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>
                              <Label color="blue">Provisioning</Label>
                            </FlexItem>
                            <FlexItem style={{ marginLeft: '0.5rem' }}>
                              {metrics.operations.provisioning} VM{metrics.operations.provisioning > 1 ? 's' : ''}
                            </FlexItem>
                          </Flex>
                        </ListItem>
                      )}
                      {metrics.operations.deprovisioning > 0 && (
                        <ListItem>
                          <Flex alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>
                              <Label color="orange">Deprovisioning</Label>
                            </FlexItem>
                            <FlexItem style={{ marginLeft: '0.5rem' }}>
                              {metrics.operations.deprovisioning} VM{metrics.operations.deprovisioning > 1 ? 's' : ''}
                            </FlexItem>
                          </Flex>
                        </ListItem>
                      )}
                    </List>
                  )}
                </CardBody>
              </Card>
            </GridItem>

            <GridItem sm={12} md={12} lg={9} xl={9} rowSpan={1}>
              <Card>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <ClockIcon style={{ marginRight: '0.5rem', color: '#f0ab00' }} />
                    </FlexItem>
                    <FlexItem>
                      Recent Activity
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  <div style={{ color: '#6a6e73', fontStyle: 'italic', padding: '1rem 0' }}>
                    No recent activity data available
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        )}
      </PageSection>

      <PageSection>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
          Quick Actions
        </Title>
        <Flex spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem>
            <Button variant="secondary" isDisabled>
              View Templates
            </Button>
          </FlexItem>
          {role === 'fulfillment-admin' && (
            <FlexItem>
              <Button variant="secondary" isDisabled>
                Manage Hubs
              </Button>
            </FlexItem>
          )}
        </Flex>
      </PageSection>
    </AppLayout>
  )
}

export default Dashboard
