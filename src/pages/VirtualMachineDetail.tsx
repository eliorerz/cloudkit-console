import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
} from '@patternfly/react-core'
import AppLayout from '../components/layouts/AppLayout'
import { getVirtualMachine } from '../api/vms'
import { VirtualMachine } from '../api/types'

const VirtualMachineDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vm, setVm] = useState<VirtualMachine | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0)

  useEffect(() => {
    const fetchVM = async () => {
      if (!id) return

      try {
        setLoading(true)
        const data = await getVirtualMachine(id)
        setVm(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching VM:', err)
        setError('Failed to load virtual machine details')
      } finally {
        setLoading(false)
      }
    }

    fetchVM()
  }, [id])

  const getStateBadge = (state?: string) => {
    if (!state) return <Label color="grey">Unknown</Label>

    const normalizedState = state.toUpperCase()

    if (normalizedState.includes('READY')) {
      return <Label color="green">Ready</Label>
    } else if (normalizedState.includes('PROGRESSING')) {
      return <Label color="blue">Progressing</Label>
    } else if (normalizedState.includes('FAILED')) {
      return <Label color="red">Failed</Label>
    }

    return <Label color="grey">{state}</Label>
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
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spinner size="xl" />
            <p style={{ marginTop: '1rem', color: '#6a6e73' }}>Loading virtual machine...</p>
          </div>
        </PageSection>
      </AppLayout>
    )
  }

  if (error || !vm) {
    return (
      <AppLayout>
        <PageSection>
          <Alert variant="danger" title="Error loading virtual machine">
            {error || 'Virtual machine not found'}
          </Alert>
        </PageSection>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageSection>
        <Breadcrumb style={{ marginBottom: '1rem' }}>
          <BreadcrumbItem to="/virtual-machines" onClick={(e) => { e.preventDefault(); navigate('/virtual-machines'); }}>
            Virtual Machines
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{vm.id}</BreadcrumbItem>
        </Breadcrumb>

        <Title headingLevel="h1" size="2xl" style={{ marginBottom: '0.5rem' }}>
          {vm.id}
        </Title>
        <div style={{ marginBottom: '1.5rem' }}>
          {getStateBadge(vm.status?.state)}
        </div>

        <Tabs activeKey={activeTabKey} onSelect={(_, tabIndex) => setActiveTabKey(tabIndex)}>
          <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
            <div style={{ padding: '1.5rem 0' }}>
              <Grid hasGutter>
                <GridItem span={6}>
                  <Card>
                    <CardBody>
                      <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                        VM Information
                      </Title>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>ID</DescriptionListTerm>
                          <DescriptionListDescription>{vm.id}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>State</DescriptionListTerm>
                          <DescriptionListDescription>{getStateBadge(vm.status?.state)}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Created</DescriptionListTerm>
                          <DescriptionListDescription>{formatTimestamp(vm.metadata?.creation_timestamp)}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Creators</DescriptionListTerm>
                          <DescriptionListDescription>{vm.metadata?.creators?.join(', ') || 'N/A'}</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={6}>
                  <Card>
                    <CardBody>
                      <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                        Network & Hub
                      </Title>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>IP Address</DescriptionListTerm>
                          <DescriptionListDescription>{vm.status?.ip_address || 'N/A'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Hub</DescriptionListTerm>
                          <DescriptionListDescription>{vm.status?.hub || 'N/A'}</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </div>
          </Tab>

          <Tab eventKey={1} title={<TabTitleText>Spec</TabTitleText>}>
            <div style={{ padding: '1.5rem 0' }}>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                    Specification
                  </Title>
                  <DescriptionList>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Template</DescriptionListTerm>
                      <DescriptionListDescription>{vm.spec?.template || 'N/A'}</DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Template Parameters</DescriptionListTerm>
                      <DescriptionListDescription>
                        {vm.spec?.template_parameters ? (
                          <pre style={{ fontSize: '0.875rem', background: '#f5f5f5', padding: '0.5rem', borderRadius: '4px' }}>
                            {JSON.stringify(vm.spec.template_parameters, null, 2)}
                          </pre>
                        ) : (
                          'N/A'
                        )}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </CardBody>
              </Card>
            </div>
          </Tab>

          <Tab eventKey={2} title={<TabTitleText>Conditions</TabTitleText>}>
            <div style={{ padding: '1.5rem 0' }}>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                    Conditions
                  </Title>
                  {vm.status?.conditions && vm.status.conditions.length > 0 ? (
                    <DescriptionList>
                      {vm.status.conditions.map((condition, index) => (
                        <div key={index} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #d2d2d2' }}>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Type</DescriptionListTerm>
                            <DescriptionListDescription>{condition.type || 'N/A'}</DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Status</DescriptionListTerm>
                            <DescriptionListDescription>{condition.status || 'N/A'}</DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Last Transition</DescriptionListTerm>
                            <DescriptionListDescription>{formatTimestamp(condition.last_transition_time)}</DescriptionListDescription>
                          </DescriptionListGroup>
                          {condition.reason && (
                            <DescriptionListGroup>
                              <DescriptionListTerm>Reason</DescriptionListTerm>
                              <DescriptionListDescription>{condition.reason}</DescriptionListDescription>
                            </DescriptionListGroup>
                          )}
                          {condition.message && (
                            <DescriptionListGroup>
                              <DescriptionListTerm>Message</DescriptionListTerm>
                              <DescriptionListDescription>{condition.message}</DescriptionListDescription>
                            </DescriptionListGroup>
                          )}
                        </div>
                      ))}
                    </DescriptionList>
                  ) : (
                    <p style={{ color: '#6a6e73', fontStyle: 'italic' }}>No conditions available</p>
                  )}
                </CardBody>
              </Card>
            </div>
          </Tab>

          <Tab eventKey={3} title={<TabTitleText>YAML</TabTitleText>}>
            <div style={{ padding: '1.5rem 0' }}>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                    Raw Object
                  </Title>
                  <pre style={{
                    fontSize: '0.875rem',
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '600px'
                  }}>
                    {JSON.stringify(vm, null, 2)}
                  </pre>
                </CardBody>
              </Card>
            </div>
          </Tab>
        </Tabs>
      </PageSection>
    </AppLayout>
  )
}

export default VirtualMachineDetail
