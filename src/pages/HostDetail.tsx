import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
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
} from '@patternfly/react-core'
import { ServerIcon } from '@patternfly/react-icons'
import yaml from 'js-yaml'
import AppLayout from '../components/layouts/AppLayout'
import { getHost } from '../api/hosts'
import { Host } from '../api/types'

const HostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [host, setHost] = useState<Host | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0)

  useEffect(() => {
    const fetchHost = async () => {
      if (!id) return

      try {
        setLoading(true)
        const data = await getHost(id)
        setHost(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching host:', err)
        setError('Failed to load host details')
      } finally {
        setLoading(false)
      }
    }

    fetchHost()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHost, 30000)
    return () => clearInterval(interval)
  }, [id])

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
            Bare Metal Hosts
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
              <CardTitle>Overview</CardTitle>
              <CardBody>
                <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Host ID</DescriptionListTerm>
                    <DescriptionListDescription>{host.id}</DescriptionListDescription>
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
                    <DescriptionListTerm>Host Pool</DescriptionListTerm>
                    <DescriptionListDescription>{host.status?.host_pool || 'N/A'}</DescriptionListDescription>
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
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={12}>
            <Card>
              <Tabs
                activeKey={activeTabKey}
                onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}
              >
                <Tab eventKey={0} title={<TabTitleText>Details</TabTitleText>}>
                  <CardBody>
                    <DescriptionList>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Host ID</DescriptionListTerm>
                        <DescriptionListDescription>
                          <code>{host.id}</code>
                        </DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>State</DescriptionListTerm>
                        <DescriptionListDescription>{host.status?.state || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Power State (Spec)</DescriptionListTerm>
                        <DescriptionListDescription>{host.spec?.power_state || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>Power State (Status)</DescriptionListTerm>
                        <DescriptionListDescription>{host.status?.power_state || 'N/A'}</DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Tab>

                <Tab eventKey={1} title={<TabTitleText>YAML</TabTitleText>}>
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
