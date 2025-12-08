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
import {
  CpuIcon,
  MemoryIcon,
  DatabaseIcon,
  PlayIcon,
  StopIcon,
  SyncIcon,
  TrashIcon,
  DesktopIcon,
} from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getVirtualMachine } from '../api/vms'
import { VirtualMachine } from '../api/types'
import { fetchAllOSImages, OSImage } from '../utils/imageRegistry'
import { logger } from '@/utils/logger'

const VirtualMachineDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vm, setVm] = useState<VirtualMachine | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0)
  const [availableOSImages, setAvailableOSImages] = useState<OSImage[]>([])

  useEffect(() => {
    const fetchVM = async () => {
      if (!id) return

      try {
        setLoading(true)
        const data = await getVirtualMachine(id)
        setVm(data)
        setError(null)
      } catch (err) {
        logger.error('Error fetching VM', err)
        setError('Failed to load virtual machine details')
      } finally {
        setLoading(false)
      }
    }

    fetchVM()
  }, [id])

  // Fetch OS images for icon display
  useEffect(() => {
    if (availableOSImages.length === 0) {
      fetchAllOSImages()
        .then((images) => {
          setAvailableOSImages(images)
        })
        .catch((error) => {
          logger.error('Failed to fetch OS images', error)
        })
    }
  }, [availableOSImages.length])

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

  const getOSIcon = (imageSource?: string): string | null => {
    if (!imageSource || availableOSImages.length === 0) return null

    // Extract OS type from image source (e.g., "quay.io/containerdisks/fedora:43" -> "fedora")
    const imageLower = imageSource.toLowerCase()

    // Try to find matching OS image
    const osImage = availableOSImages.find(img => {
      const repoLower = img.repository.toLowerCase()
      return imageLower.includes(repoLower) || imageLower.includes(img.os.toLowerCase())
    })

    return osImage?.icon || null
  }

  const getOSName = (imageSource?: string): string => {
    if (!imageSource || availableOSImages.length === 0) return 'N/A'

    const imageLower = imageSource.toLowerCase()

    const osImage = availableOSImages.find(img => {
      const repoLower = img.repository.toLowerCase()
      return imageLower.includes(repoLower) || imageLower.includes(img.os.toLowerCase())
    })

    return osImage?.displayName || 'N/A'
  }

  const parseTemplateParameters = (params?: Record<string, unknown>) => {
    if (!params) return null

    const getParamValue = (key: string) => {
      const param = params[key] as { value?: unknown } | undefined
      return param?.value
    }

    const getValue = (key: string, defaultValue: string = 'N/A'): string => {
      const value = getParamValue(key)
      return value ? String(value) : defaultValue
    }

    return {
      cpu: getValue('vm_cpu_cores'),
      memory: getValue('vm_memory_size'),
      disk: getValue('vm_disk_size'),
      osType: getValue('vm_os_type', 'Unknown'),
      imageSource: getValue('vm_image_source'),
      namespace: getValue('vm_namespace'),
      networkType: getValue('vm_network_type'),
      storageClass: getValue('storage_class'),
      exposeService: Boolean(getParamValue('vm_expose_service')),
      runStrategy: getValue('vm_run_strategy'),
      serviceType: getValue('vm_service_type'),
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
          <BreadcrumbItem isActive>{vm.metadata?.name || vm.id}</BreadcrumbItem>
        </Breadcrumb>

        <Title headingLevel="h1" size="2xl" style={{ marginBottom: '0.5rem' }}>
          {vm.metadata?.name || vm.id}
        </Title>
        <div style={{ marginBottom: '1.5rem' }}>
          {getStateBadge(vm.status?.state)}
        </div>

        <Tabs activeKey={activeTabKey} onSelect={(_, tabIndex) => setActiveTabKey(tabIndex)}>
          <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
            <div style={{ padding: '1.5rem 0' }}>
              <Grid hasGutter>
                <GridItem span={7}>
                  <Card isFullHeight>
                    <CardBody style={{ position: 'relative' }}>
                      {(() => {
                        const params = parseTemplateParameters(vm.spec?.template_parameters as Record<string, unknown> | undefined)
                        const iconUrl = getOSIcon(params?.imageSource as string | undefined)
                        return iconUrl ? (
                          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                            <img src={iconUrl} alt="OS" style={{ width: '64px', height: '64px' }} />
                          </div>
                        ) : null
                      })()}
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Name</DescriptionListTerm>
                          <DescriptionListDescription>{vm.metadata?.name || 'N/A'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>ID</DescriptionListTerm>
                          <DescriptionListDescription>{vm.id}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Template</DescriptionListTerm>
                          <DescriptionListDescription>{vm.spec?.template || 'N/A'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Operating System</DescriptionListTerm>
                          <DescriptionListDescription>
                            {(() => {
                              const params = parseTemplateParameters(vm.spec?.template_parameters as Record<string, unknown> | undefined)
                              return getOSName(params?.imageSource as string | undefined)
                            })()}
                          </DescriptionListDescription>
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

                <GridItem span={5}>
                  <Flex direction={{ default: 'column' }} style={{ height: '100%', maxWidth: '460px' }}>
                    <FlexItem style={{ marginBottom: '1rem' }}>
                      <Card>
                        <CardBody>
                          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>
                              <img
                                src="/terminal.png"
                                alt="Terminal Console"
                                style={{
                                  width: '250px',
                                  height: 'auto'
                                }}
                              />
                            </FlexItem>
                            <FlexItem>
                              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                <FlexItem>
                                  <Label color="blue" icon={<PlayIcon />} style={{ cursor: 'pointer', width: '110px', justifyContent: 'center' }}>Start</Label>
                                </FlexItem>
                                <FlexItem>
                                  <Label color="red" icon={<StopIcon />} style={{ cursor: 'pointer', width: '110px', justifyContent: 'center' }}>Stop</Label>
                                </FlexItem>
                                <FlexItem>
                                  <Label color="grey" icon={<SyncIcon />} style={{ cursor: 'pointer', width: '110px', justifyContent: 'center' }}>Restart</Label>
                                </FlexItem>
                                <FlexItem>
                                  <Label color="green" icon={<DesktopIcon />} style={{ cursor: 'pointer', width: '110px', justifyContent: 'center' }}>Console</Label>
                                </FlexItem>
                                <FlexItem>
                                  <Label color="red" icon={<TrashIcon />} style={{ cursor: 'pointer', width: '110px', justifyContent: 'center' }}>Delete</Label>
                                </FlexItem>
                              </Flex>
                            </FlexItem>
                          </Flex>
                        </CardBody>
                      </Card>
                    </FlexItem>
                    <FlexItem grow={{ default: 'grow' }}>
                      <Card isFullHeight>
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
                    </FlexItem>
                  </Flex>
                </GridItem>
              </Grid>
            </div>
          </Tab>

          <Tab eventKey={1} title={<TabTitleText>Spec</TabTitleText>}>
            <div style={{ padding: '1.5rem 0' }}>
              <Grid hasGutter>
                {(() => {
                  const params = parseTemplateParameters(vm.spec?.template_parameters as Record<string, unknown> | undefined)
                  if (!params) {
                    return (
                      <GridItem span={12}>
                        <Alert variant="info" title="No specification available" isInline>
                          Template parameters not found
                        </Alert>
                      </GridItem>
                    )
                  }

                  return (
                    <>
                      <GridItem span={12}>
                        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1rem' }}>
                          Resources
                        </Title>
                      </GridItem>

                      <GridItem span={4}>
                        <Card isFullHeight>
                          <CardBody>
                            <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }} style={{ textAlign: 'center' }}>
                              <FlexItem style={{ fontSize: '3rem', color: '#06c' }}>
                                <CpuIcon />
                              </FlexItem>
                              <FlexItem>
                                <Title headingLevel="h3" size="xl" style={{ marginTop: '0.5rem' }}>
                                  {params.cpu}
                                </Title>
                                <div style={{ color: '#6a6e73', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                  vCPU Cores
                                </div>
                              </FlexItem>
                            </Flex>
                          </CardBody>
                        </Card>
                      </GridItem>

                      <GridItem span={4}>
                        <Card isFullHeight>
                          <CardBody>
                            <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }} style={{ textAlign: 'center' }}>
                              <FlexItem style={{ fontSize: '3rem', color: '#06c' }}>
                                <MemoryIcon />
                              </FlexItem>
                              <FlexItem>
                                <Title headingLevel="h3" size="xl" style={{ marginTop: '0.5rem' }}>
                                  {params.memory}
                                </Title>
                                <div style={{ color: '#6a6e73', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                  Memory
                                </div>
                              </FlexItem>
                            </Flex>
                          </CardBody>
                        </Card>
                      </GridItem>

                      <GridItem span={4}>
                        <Card isFullHeight>
                          <CardBody>
                            <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }} style={{ textAlign: 'center' }}>
                              <FlexItem style={{ fontSize: '3rem', color: '#06c' }}>
                                <DatabaseIcon />
                              </FlexItem>
                              <FlexItem>
                                <Title headingLevel="h3" size="xl" style={{ marginTop: '0.5rem' }}>
                                  {params.disk}
                                </Title>
                                <div style={{ color: '#6a6e73', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                  Disk Size
                                </div>
                              </FlexItem>
                            </Flex>
                          </CardBody>
                        </Card>
                      </GridItem>

                      <GridItem span={12}>
                        <Title headingLevel="h2" size="xl" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                          Configuration
                        </Title>
                      </GridItem>

                      <GridItem span={6}>
                        <Card>
                          <CardTitle>System Configuration</CardTitle>
                          <CardBody>
                            <DescriptionList>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Operating System</DescriptionListTerm>
                                <DescriptionListDescription>{params.osType}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Image Source</DescriptionListTerm>
                                <DescriptionListDescription>{params.imageSource}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Namespace</DescriptionListTerm>
                                <DescriptionListDescription>{params.namespace}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Run Strategy</DescriptionListTerm>
                                <DescriptionListDescription>{params.runStrategy}</DescriptionListDescription>
                              </DescriptionListGroup>
                            </DescriptionList>
                          </CardBody>
                        </Card>
                      </GridItem>

                      <GridItem span={6}>
                        <Card>
                          <CardTitle>Network & Storage</CardTitle>
                          <CardBody>
                            <DescriptionList>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Network Type</DescriptionListTerm>
                                <DescriptionListDescription>{params.networkType}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Storage Class</DescriptionListTerm>
                                <DescriptionListDescription>{params.storageClass}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Expose Service</DescriptionListTerm>
                                <DescriptionListDescription>{params.exposeService ? 'Yes' : 'No'}</DescriptionListDescription>
                              </DescriptionListGroup>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Service Type</DescriptionListTerm>
                                <DescriptionListDescription>{params.serviceType}</DescriptionListDescription>
                              </DescriptionListGroup>
                            </DescriptionList>
                          </CardBody>
                        </Card>
                      </GridItem>
                    </>
                  )
                })()}
              </Grid>
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
