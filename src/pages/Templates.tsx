import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PageSection,
  Title,
  Grid,
  GridItem,
  Card,
  CardTitle,
  CardBody,
  CardFooter,
  Label,
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Divider,
  Sidebar,
  SidebarPanel,
  SidebarContent,
  Checkbox,
  Spinner,
  TextInput,
  Form,
  FormGroup,
  Alert,
  ValidatedOptions,
} from '@patternfly/react-core'
import { CubeIcon, RocketIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getTemplates } from '../api/templates'
import { Template } from '../api/types'
import { createVirtualMachine } from '../api/vms'
import { getOSImages, OSImage } from '../api/os-images'
import { getHostClasses, HostClass } from '../api/host-classes'
import { logger } from '@/utils/logger'

const Templates: React.FC = () => {
  const { t } = useTranslation(['templates', 'common'])
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [osImages, setOsImages] = useState<OSImage[]>([])
  const [hostClasses, setHostClasses] = useState<Record<string, HostClass>>({})

  // Filter states
  const [selectedOSTypes, setSelectedOSTypes] = useState<string[]>([])
  const [selectedCPUCores, setSelectedCPUCores] = useState<string[]>([])

  // Quick Create VM from template state
  const [isQuickCreateMode, setIsQuickCreateMode] = useState(false)
  const [vmName, setVmName] = useState('')
  const [vmNameValidated, setVmNameValidated] = useState<ValidatedOptions>(ValidatedOptions.default)
  const [isCreatingVM, setIsCreatingVM] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true)
      try {
        const response = await getTemplates()
        setTemplates(response.items || [])
      } catch (error) {
        logger.error('Error fetching templates', error)
        setTemplates([])
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  useEffect(() => {
    const fetchOSImages = async () => {
      try {
        const response = await getOSImages()
        setOsImages(response.images || [])
      } catch (error) {
        logger.error('Error fetching OS images', error)
        setOsImages([])
      }
    }

    fetchOSImages()
  }, [])

  useEffect(() => {
    const fetchHostClasses = async () => {
      try {
        const classes = await getHostClasses()
        setHostClasses(classes || {})
      } catch (error) {
        logger.error('Error fetching host classes', error)
        setHostClasses({})
      }
    }

    fetchHostClasses()
  }, [])

  // Helper to get OS icon from image source parameter
  const getOSIcon = (template: Template): string | null => {
    const imageParam = template.parameters?.find(p => p.name === 'vm_image_source')
    const imageSource = imageParam?.default?.value

    if (!imageSource || typeof imageSource !== 'string') return null

    const imageLower = imageSource.toLowerCase()
    const matchedImage = osImages.find((img: OSImage) =>
      imageLower.includes(img.os.toLowerCase())
    )

    return matchedImage?.icon || null
  }

  // Helper to get OS type from template
  const getOSType = (template: Template): string => {
    const imageParam = template.parameters?.find(p => p.name === 'vm_image_source')
    const imageSource = imageParam?.default?.value

    if (!imageSource || typeof imageSource !== 'string') return 'Unknown'

    const imageLower = imageSource.toLowerCase()
    if (imageLower.includes('rhel') || imageLower.includes('red hat')) return 'RHEL'
    if (imageLower.includes('ubuntu')) return 'Ubuntu'
    if (imageLower.includes('fedora')) return 'Fedora'
    if (imageLower.includes('centos')) return 'CentOS'
    if (imageLower.includes('debian')) return 'Debian'

    return 'Other'
  }

  // Helper to get parameter value
  const getParamValue = (template: Template, paramName: string): string => {
    const param = template.parameters?.find(p => p.name === paramName)
    if (param?.default?.value !== undefined && param?.default?.value !== null) {
      return String(param.default.value)
    }
    return 'N/A'
  }

  // Extract machine type from template ID and get host class info
  const getMachineInfo = (templateId: string): { type: string; hostClass: HostClass | null } => {
    const match = templateId.match(/^([a-z0-9]+)-/)
    if (match) {
      const machineType = match[1].toLowerCase()
      const hostClass = hostClasses[machineType] || null
      const displayType = hostClass?.name || machineType.toUpperCase()
      return { type: displayType, hostClass }
    }
    return { type: templateId, hostClass: null }
  }

  // Define OS filter options
  const osFilterOptions = ['Fedora', 'CentOS Stream', 'Red Hat Enterprise Linux', 'Windows']

  // Get unique CPU core values from templates
  const cpuCoreOptions = useMemo(() => {
    const cores = new Set<string>()
    templates.forEach(template => {
      const cpuCores = getParamValue(template, 'vm_cpu_cores')
      if (cpuCores && cpuCores !== 'N/A') {
        cores.add(cpuCores)
      }
    })
    return Array.from(cores).sort((a, b) => parseInt(a) - parseInt(b))
  }, [templates])

  // Filtered templates based on filter criteria
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // OS Type filter
      if (selectedOSTypes.length > 0) {
        const osType = getOSType(template)
        const matchesOS = selectedOSTypes.some(selectedOS => {
          if (selectedOS === 'Red Hat Enterprise Linux') {
            return osType === 'RHEL' || osType.toLowerCase().includes('red hat')
          }
          if (selectedOS === 'CentOS Stream') {
            return osType.toLowerCase().includes('centos')
          }
          return osType.toLowerCase().includes(selectedOS.toLowerCase())
        })
        if (!matchesOS) {
          return false
        }
      }

      // CPU Cores filter
      if (selectedCPUCores.length > 0) {
        const cpuCores = getParamValue(template, 'vm_cpu_cores')
        if (!selectedCPUCores.includes(cpuCores)) {
          return false
        }
      }

      return true
    })
  }, [templates, selectedOSTypes, selectedCPUCores])

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template)
    setIsQuickCreateMode(false)
    setVmName('')
    setVmNameValidated(ValidatedOptions.default)
    setCreateError(null)
    setCreateSuccess(false)
  }

  const handleCloseDrawer = () => {
    setSelectedTemplate(null)
    setIsQuickCreateMode(false)
    setVmName('')
    setVmNameValidated(ValidatedOptions.default)
    setCreateError(null)
    setCreateSuccess(false)
  }

  const handleCreateVMClick = () => {
    if (selectedTemplate) {
      navigate(`/virtual-machines/create-new?template=${selectedTemplate.id}&from=templates`)
    }
  }

  // Validate VM name
  const validateVmName = (name: string): boolean => {
    if (!name || name.trim().length === 0) {
      setVmNameValidated(ValidatedOptions.error)
      setCreateError(t('templates:quickCreate.errorNameRequired'))
      return false
    }
    const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
    if (!k8sNameRegex.test(name) || name.length > 63) {
      setVmNameValidated(ValidatedOptions.error)
      setCreateError(t('templates:quickCreate.errorNameInvalid'))
      return false
    }
    setVmNameValidated(ValidatedOptions.success)
    setCreateError(null)
    return true
  }

  // Handle quick VM creation from template
  const handleQuickCreateVM = async () => {
    if (!selectedTemplate) return

    if (!validateVmName(vmName)) {
      return
    }

    setIsCreatingVM(true)
    setCreateError(null)

    try {
      const parameters: Record<string, unknown> = {}
      selectedTemplate.parameters?.forEach(param => {
        if (param.default?.value !== undefined && param.default?.value !== null) {
          parameters[param.name] = param.default.value
        }
      })

      await createVirtualMachine({
        id: vmName,
        spec: {
          template: selectedTemplate.id,
          template_parameters: parameters
        }
      })

      setCreateSuccess(true)
      setTimeout(() => {
        handleCloseDrawer()
      }, 1500)
    } catch (error) {
      logger.error('Failed to create VM', error)
      if (error instanceof Error) {
        setCreateError(error.message)
      } else {
        setCreateError('Failed to create virtual machine')
      }
    } finally {
      setIsCreatingVM(false)
    }
  }

  const handleOSTypeChange = (osType: string, checked: boolean) => {
    if (checked) {
      setSelectedOSTypes([...selectedOSTypes, osType])
    } else {
      setSelectedOSTypes(selectedOSTypes.filter((t) => t !== osType))
    }
  }

  const handleCPUCoresChange = (cores: string, checked: boolean) => {
    if (checked) {
      setSelectedCPUCores([...selectedCPUCores, cores])
    } else {
      setSelectedCPUCores(selectedCPUCores.filter((c) => c !== cores))
    }
  }

  const drawerContent = selectedTemplate && (
    <div
      style={{
        width: '650px',
        height: 'calc(100vh - 80px)',
        position: 'fixed',
        right: 0,
        top: '80px',
        bottom: 0,
        zIndex: 9999,
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        borderTopLeftRadius: '18px'
      }}
    >
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #d2d2d2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {getOSIcon(selectedTemplate) ? (
              <img
                src={getOSIcon(selectedTemplate)!}
                alt="OS icon"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  padding: '4px',
                  backgroundColor: '#f8f8f8',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#06c',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px'
              }}>
                <CubeIcon />
              </div>
            )}
            <Title headingLevel="h2" size="xl">
              {selectedTemplate.title}
            </Title>
          </div>
          <Button variant="plain" onClick={handleCloseDrawer} aria-label="Close">
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>×</span>
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {!isQuickCreateMode ? (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <Title headingLevel="h3" size="md" style={{ marginBottom: '0.75rem' }}>
                {t('templates:detail.overview')}
              </Title>
              <p style={{ color: 'var(--pf-v6-global--Color--200)', lineHeight: '1.5' }}>
                {selectedTemplate.description || t('templates:detail.noDescription')}
              </p>
            </div>

            <Divider style={{ margin: '1.5rem 0' }} />

            <Title headingLevel="h3" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem' }}>
              {t('templates:detail.templateConfiguration')}
            </Title>

            <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('templates:detail.machineType')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {getMachineInfo(selectedTemplate.id).type}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('templates:detail.osType')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {getOSType(selectedTemplate)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            <Divider style={{ margin: '1.5rem 0' }} />

            <Title headingLevel="h3" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem' }}>
              {t('templates:detail.hardwareSpecs')}
            </Title>

            <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('templates:detail.cpuCores')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {getParamValue(selectedTemplate, 'vm_cpu_cores')}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('templates:detail.memory')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {getParamValue(selectedTemplate, 'vm_memory_size')}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('templates:detail.diskSize')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {getParamValue(selectedTemplate, 'vm_disk_size')}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('templates:detail.networkType')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {getParamValue(selectedTemplate, 'vm_network_type')}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            {getMachineInfo(selectedTemplate.id).hostClass && (
              <>
                <Divider style={{ margin: '1.5rem 0' }} />

                <Title headingLevel="h3" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem' }}>
                  {t('templates:detail.hostClassDetails')}
                </Title>

                <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
                  {getMachineInfo(selectedTemplate.id).hostClass && (
                    <>
                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('templates:detail.description')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {getMachineInfo(selectedTemplate.id).hostClass!.description}
                        </DescriptionListDescription>
                      </DescriptionListGroup>

                      <DescriptionListGroup>
                        <DescriptionListTerm>{t('templates:detail.category')}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {getMachineInfo(selectedTemplate.id).hostClass!.category}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </>
                  )}
                </DescriptionList>
              </>
            )}

            <Divider style={{ margin: '1.5rem 0' }} />

            <Button variant="primary" isBlock onClick={handleCreateVMClick} icon={<RocketIcon />}>
              {t('templates:actions.createVM')}
            </Button>
          </>
        ) : (
          <>
            {createSuccess ? (
              <Alert variant="success" isInline title={t('templates:quickCreate.success')} style={{ marginBottom: '1rem' }}>
                {t('templates:quickCreate.successMessage')}
              </Alert>
            ) : (
              <>
                {createError && (
                  <Alert variant="danger" isInline title={t('templates:quickCreate.error')} style={{ marginBottom: '1rem' }}>
                    {createError}
                  </Alert>
                )}

                <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>
                  {t('templates:quickCreate.title')}
                </Title>

                <Form>
                  <FormGroup label={t('templates:quickCreate.vmName')} isRequired fieldId="vm-name">
                    <TextInput
                      isRequired
                      type="text"
                      id="vm-name"
                      name="vm-name"
                      value={vmName}
                      onChange={(_event, value) => {
                        setVmName(value)
                        if (vmNameValidated !== ValidatedOptions.default) {
                          setVmNameValidated(ValidatedOptions.default)
                          setCreateError(null)
                        }
                      }}
                      validated={vmNameValidated}
                      placeholder="my-virtual-machine"
                      isDisabled={isCreatingVM}
                    />
                    {vmNameValidated === ValidatedOptions.default && (
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                        {t('templates:quickCreate.vmNameHelp')}
                      </div>
                    )}
                  </FormGroup>
                </Form>

                <Divider style={{ margin: '1.5rem 0' }} />

                <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginBottom: '0.5rem' }}>
                    <strong>{t('templates:quickCreate.templateConfig')}</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    • {t('templates:quickCreate.cpu')}: <strong>{getParamValue(selectedTemplate, 'vm_cpu_cores')} {t('templates:filters.cores')}</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    • {t('templates:quickCreate.memory')}: <strong>{getParamValue(selectedTemplate, 'vm_memory_size')}</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    • {t('templates:quickCreate.disk')}: <strong>{getParamValue(selectedTemplate, 'vm_disk_size')}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="primary"
                    onClick={handleQuickCreateVM}
                    isDisabled={isCreatingVM || !vmName}
                    isLoading={isCreatingVM}
                    style={{ flex: 1 }}
                  >
                    {isCreatingVM ? t('templates:actions.creating') : t('templates:actions.create')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsQuickCreateMode(false)}
                    isDisabled={isCreatingVM}
                  >
                    {t('templates:actions.cancel')}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )

  const filterPanel = (
    <SidebarPanel variant="sticky" style={{ backgroundColor: '#f5f5f5', padding: '1.5rem', minWidth: '280px' }}>
      <Title headingLevel="h3" size="md" style={{ marginBottom: '1.5rem' }}>
        {t('templates:filters.title')}
      </Title>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
          {t('templates:filters.os')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {osFilterOptions.map(osType => (
            <Checkbox
              key={osType}
              id={`os-${osType}`}
              label={osType}
              isChecked={selectedOSTypes.includes(osType)}
              onChange={(_event, checked) => handleOSTypeChange(osType, checked)}
            />
          ))}
        </div>
      </div>

      <Divider style={{ margin: '1rem 0' }} />

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
          {t('templates:filters.hardwareCPU')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {cpuCoreOptions.map(cores => (
            <Checkbox
              key={cores}
              id={`cpu-${cores}`}
              label={`${cores} ${t('templates:filters.cores')}`}
              isChecked={selectedCPUCores.includes(cores)}
              onChange={(_event, checked) => handleCPUCoresChange(cores, checked)}
            />
          ))}
        </div>
      </div>
    </SidebarPanel>
  )

  return (
    <AppLayout>
      {selectedTemplate && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 9998,
            pointerEvents: 'none'
          }}
        />,
        document.body
      )}
      {selectedTemplate && createPortal(drawerContent, document.body)}
      <PageSection style={{ backgroundColor: '#f5f5f5', padding: 0 }}>
        <Sidebar hasGutter>
          {filterPanel}
          <SidebarContent style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <Title headingLevel="h1" size="2xl" style={{ marginBottom: '0.5rem' }}>
                {t('templates:title')}
              </Title>
              <p style={{ color: 'var(--pf-v6-global--Color--200)' }}>
                {t('templates:description')}
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Spinner size="xl" />
                <p style={{ marginTop: '1rem', color: 'var(--pf-v6-global--Color--200)' }}>
                  {t('templates:list.loading')}
                </p>
              </div>
            ) : (
              <>
                <Grid hasGutter span={12}>
                  {filteredTemplates.map((template) => {
                    const osIcon = getOSIcon(template)
                    const cpuCores = getParamValue(template, 'vm_cpu_cores')
                    const memory = getParamValue(template, 'vm_memory_size')
                    const diskSize = getParamValue(template, 'vm_disk_size')

                    return (
                      <GridItem key={template.id} span={12} sm={6} lg={4}>
                        <Card
                          isSelectable
                          isSelected={selectedTemplate?.id === template.id}
                          onClick={() => handleTemplateClick(template)}
                          style={{
                            cursor: 'pointer',
                            height: '100%',
                            minWidth: '365px',
                            backgroundColor: '#ffffff',
                            border: selectedTemplate?.id === template.id
                              ? '2px solid var(--pf-v6-global--primary-color--100)'
                              : '1px solid #d2d2d2',
                          }}
                        >
                          <CardTitle>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                              {osIcon ? (
                                <img
                                  src={osIcon}
                                  alt="OS icon"
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '8px',
                                    padding: '4px',
                                    backgroundColor: '#f8f8f8',
                                    objectFit: 'contain'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '48px',
                                  height: '48px',
                                  backgroundColor: '#06c',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '24px'
                                }}>
                                  <CubeIcon />
                                </div>
                              )}
                              <div>
                                <span style={{ fontWeight: 600, fontSize: '1rem', display: 'block' }}>{template.title}</span>
                              </div>
                            </div>
                          </CardTitle>
                          <CardBody>
                            <div style={{ marginBottom: '1rem' }}>
                              <p
                                style={{
                                  color: 'var(--pf-v6-global--Color--200)',
                                  fontSize: '0.875rem',
                                  lineHeight: '1.5',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  minHeight: '2.625rem',
                                }}
                              >
                                {template.description || t('templates:detail.noDescription')}
                              </p>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#000000', marginBottom: '0.5rem' }}>
                                {t('templates:detail.configuration')}
                              </div>
                              <ul style={{
                                margin: 0,
                                paddingLeft: 0,
                                listStyle: 'none',
                                fontSize: '0.75rem',
                                color: 'var(--pf-v6-global--Color--200)',
                                lineHeight: '1.6',
                              }}>
                                <li><strong>{t('templates:quickCreate.cpu')}:</strong> {cpuCores} {t('templates:filters.cores')}</li>
                                <li><strong>{t('templates:quickCreate.memory')}:</strong> {memory}</li>
                                <li><strong>{t('templates:quickCreate.disk')}:</strong> {diskSize}</li>
                                <li><strong>{t('templates:filters.os')}:</strong> {getOSType(template)}</li>
                              </ul>
                            </div>
                          </CardBody>
                          <CardFooter>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <Label color="purple" isCompact>
                                {getOSType(template)}
                              </Label>
                            </div>
                          </CardFooter>
                        </Card>
                      </GridItem>
                    )
                  })}
                </Grid>

                {filteredTemplates.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '3rem',
                      color: 'var(--pf-v6-global--Color--200)',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                    }}
                  >
                    {t('templates:list.noResults')}
                  </div>
                )}
              </>
            )}
          </SidebarContent>
        </Sidebar>
      </PageSection>
    </AppLayout>
  )
}

export default Templates
