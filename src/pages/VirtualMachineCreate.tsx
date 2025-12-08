import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormGroup,
  TextInput,
  Button,
  Alert,
  Spinner,
  Card,
  CardBody,
  ActionGroup,
  Sidebar,
  SidebarPanel,
  SidebarContent,
  Slider,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  FileUpload,
  TextArea,
  Checkbox,
} from '@patternfly/react-core'
import AppLayout from '../components/layouts/AppLayout'
import { getTemplates } from '../api/templates'
import { createVirtualMachine } from '../api/vms'
import { Template } from '../api/types'
import { logger } from '@/utils/logger'

// Machine size presets - moved to component to access t()
const getMachineSizeTiers = (t: (key: string) => string) => ({
  standard: {
    title: t('vmCreate:machineSizes.standard'),
    sizes: [
      { id: 'tiny', name: t('vmCreate:machineSizes.tiny.name'), cpu: 2, memory: 4, description: t('vmCreate:machineSizes.tiny.description') },
      { id: 'small', name: t('vmCreate:machineSizes.small.name'), cpu: 4, memory: 8, description: t('vmCreate:machineSizes.small.description') },
      { id: 'medium', name: t('vmCreate:machineSizes.medium.name'), cpu: 8, memory: 16, description: t('vmCreate:machineSizes.medium.description') },
      { id: 'large', name: t('vmCreate:machineSizes.large.name'), cpu: 16, memory: 32, description: t('vmCreate:machineSizes.large.description') },
    ]
  },
  highPerformance: {
    title: t('vmCreate:machineSizes.highPerformance'),
    sizes: [
      { id: 'xlarge', name: t('vmCreate:machineSizes.xlarge.name'), cpu: 32, memory: 64, description: t('vmCreate:machineSizes.xlarge.description') },
      { id: '2xlarge', name: t('vmCreate:machineSizes.2xlarge.name'), cpu: 48, memory: 128, description: t('vmCreate:machineSizes.2xlarge.description') },
      { id: '3xlarge', name: t('vmCreate:machineSizes.3xlarge.name'), cpu: 64, memory: 256, description: t('vmCreate:machineSizes.3xlarge.description') },
      { id: '4xlarge', name: t('vmCreate:machineSizes.4xlarge.name'), cpu: 64, memory: 512, description: t('vmCreate:machineSizes.4xlarge.description') },
    ]
  }
})

// Disk size options for slider
const diskSizeOptions = [
  { value: 50, label: '' },
  { value: 100, label: '' },
  { value: 200, label: '200Gi' },
  { value: 500, label: '' },
  { value: 1024, label: '1Ti' },
  { value: 2048, label: '2Ti' },
  { value: 3072, label: '3Ti' },
  { value: 4096, label: '4Ti' },
  { value: 5120, label: '5Ti' },
]

// Helper to format disk size
const formatDiskSize = (sizeInGi: number): string => {
  if (sizeInGi >= 1024) {
    const ti = sizeInGi / 1024
    return ti % 1 === 0 ? `${ti} Ti` : `${ti.toFixed(1)} Ti`
  }
  return `${sizeInGi} Gi`
}

interface WizardStep {
  id: string
  name: string
  completed: boolean
}

const VirtualMachineCreate: React.FC = () => {
  const { t } = useTranslation(['vmCreate', 'common'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const templateId = searchParams.get('template')
  const fromPage = searchParams.get('from') || 'templates'

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Form state
  const [vmName, setVmName] = useState('')
  const [selectedSizePreset, setSelectedSizePreset] = useState('medium')
  const [vmCpuCores, setVmCpuCores] = useState(8)
  const [vmMemoryGi, setVmMemoryGi] = useState(16)
  const [vmDiskGi, setVmDiskGi] = useState(200)
  const [vmRunStrategy, setVmRunStrategy] = useState('Always')
  const [customizeTemplate, setCustomizeTemplate] = useState(false)
  const [vmImageSource, setVmImageSource] = useState('')
  const [sshPublicKey, setSshPublicKey] = useState('')
  const [cloudInitFilename, setCloudInitFilename] = useState('')
  const [cloudInitContent, setCloudInitContent] = useState('')
  const [runStrategyOpen, setRunStrategyOpen] = useState(false)
  const [selectedSeries, setSelectedSeries] = useState<'standard' | 'highPerformance'>('standard')

  // Load template callback
  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setError('No template specified')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await getTemplates()
      const foundTemplate = response.items?.find(t => t.id === templateId)

      if (!foundTemplate) {
        setError(`Template '${templateId}' not found`)
        return
      }

      setTemplate(foundTemplate)

      // Load image source from template
      const imageParam = foundTemplate.parameters?.find(p => p.name === 'vm_image_source')
      if (imageParam?.default?.value) {
        setVmImageSource(String(imageParam.default.value))
      }
    } catch (err: unknown) {
      logger.error('Failed to load template', err)
      const error = err as { message?: string }
      setError(error.message || 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  // Machine size tiers with translations
  const machineSizeTiers = useMemo(() => getMachineSizeTiers(t), [t])

  // Steps - dynamically build based on customization
  const steps: WizardStep[] = useMemo(() => {
    const allSteps = [
      { id: 'vm-details', name: t('vmCreate:steps.vmDetails'), completed: currentStepIndex > 0 },
      ...(customizeTemplate ? [{ id: 'hardware', name: t('vmCreate:steps.hardware'), completed: currentStepIndex > 1 }] : []),
      { id: 'review', name: t('vmCreate:steps.review'), completed: currentStepIndex > (customizeTemplate ? 2 : 1) },
    ]
    return allSteps
  }, [currentStepIndex, customizeTemplate, t])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  // Sync preset selection with hardware values
  useEffect(() => {
    if (selectedSizePreset) {
      let preset = machineSizeTiers.standard.sizes.find(p => p.id === selectedSizePreset)
      if (!preset) {
        preset = machineSizeTiers.highPerformance.sizes.find(p => p.id === selectedSizePreset)
      }
      if (preset) {
        setVmCpuCores(preset.cpu)
        setVmMemoryGi(preset.memory)
      }
    }
  }, [selectedSizePreset, machineSizeTiers.highPerformance.sizes, machineSizeTiers.standard.sizes])

  const handleCreate = async () => {
    try {
      setCreating(true)
      setError(null)

      if (!template) return

      // Helper to wrap value in protobuf type
      const wrapProtobufValue = (paramType: string, value: unknown) => {
        return {
          '@type': paramType,
          value: value
        }
      }

      // Build request payload
      const payload: Record<string, unknown> = {
        metadata: {
          name: vmName
        },
        spec: {
          template: template.id
        }
      }

      // Build template_parameters
      const parameters: Record<string, unknown> = {}
      let hasParameters = false

      template.parameters?.forEach(param => {
        if (param.type && (param.default?.value !== undefined && param.default?.value !== null)) {
          let value: unknown
          let shouldInclude = false

          // When customizing, include all parameters (override specific ones with user values)
          if (customizeTemplate) {
            if (param.name === 'vm_cpu_cores') {
              // Int64Value expects string representation
              value = String(vmCpuCores)
            } else if (param.name === 'vm_memory_size') {
              value = `${vmMemoryGi}Gi`
            } else if (param.name === 'vm_disk_size') {
              value = `${vmDiskGi}Gi`
            } else if (param.name === 'vm_image_source') {
              value = vmImageSource
            } else if (param.name === 'ssh_public_key' && sshPublicKey) {
              // Use user-provided SSH key
              value = sshPublicKey
            } else if (param.name === 'cloud_init_user_data' && cloudInitContent) {
              // Use user-provided cloud-init content
              value = cloudInitContent
            } else {
              // Use template default for other parameters
              value = param.default.value
            }
            shouldInclude = true
          } else if (param.name === 'ssh_public_key' && sshPublicKey) {
            // Always include SSH key if provided (non-customize mode)
            value = sshPublicKey
            shouldInclude = true
          }

          if (shouldInclude) {
            // Wrap in protobuf type
            parameters[param.name] = wrapProtobufValue(param.type, value)
            hasParameters = true
          }
        }
      })

      // Only add template_parameters if there are any
      if (hasParameters) {
        (payload.spec as Record<string, unknown>).template_parameters = parameters
      }

      await createVirtualMachine(payload)

      navigate('/virtual-machines')
    } catch (err: unknown) {
      logger.error('Failed to create VM', err)
      const error = err as { message?: string }
      setError(error.message || 'Failed to create VM')
    } finally {
      setCreating(false)
    }
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      handleCreate()
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const canProceed = () => {
    if (steps[currentStepIndex].id === 'vm-details') {
      return vmName.trim().length > 0
    }
    return true
  }

  const renderStepContent = () => {
    const currentStep = steps[currentStepIndex]

    switch (currentStep.id) {
      case 'vm-details':
        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              {t('vmCreate:steps.vmDetails')}
            </Title>
            <Form>
              <FormGroup label={t('vmCreate:form.vmName.label')} isRequired fieldId="vm-name">
                <TextInput
                  isRequired
                  type="text"
                  id="vm-name"
                  value={vmName}
                  onChange={(_event, value) => setVmName(value)}
                  placeholder={t('vmCreate:form.vmName.placeholder')}
                />
              </FormGroup>

              <FormGroup label={t('vmCreate:form.imageSource.label')} isRequired fieldId="vm-image" style={{ marginTop: '1.5rem' }}>
                <TextInput
                  isRequired
                  type="text"
                  id="vm-image"
                  value={vmImageSource}
                  onChange={(_event, value) => setVmImageSource(value)}
                  isDisabled={!customizeTemplate}
                  style={{
                    backgroundColor: customizeTemplate ? '#ffffff' : '#f5f5f5',
                    color: customizeTemplate ? '#151515' : '#6a6e73'
                  }}
                />
              </FormGroup>

              <FormGroup label={t('vmCreate:form.sshKey.label')} fieldId="ssh-key" style={{ marginTop: '1.5rem' }}>
                <TextArea
                  id="ssh-key"
                  value={sshPublicKey}
                  onChange={(_event, value) => setSshPublicKey(value)}
                  placeholder={t('vmCreate:form.sshKey.placeholder')}
                  rows={5}
                  resizeOrientation="vertical"
                />
              </FormGroup>

              <FormGroup fieldId="customize-template" style={{ marginTop: '1.5rem' }}>
                <Checkbox
                  id="customize-template"
                  label={t('vmCreate:form.customize.label')}
                  description={t('vmCreate:form.customize.description')}
                  isChecked={customizeTemplate}
                  onChange={(_event, checked) => setCustomizeTemplate(checked)}
                />
              </FormGroup>

              {customizeTemplate && (
                <FormGroup label={t('vmCreate:form.cloudInit.label')} fieldId="cloud-init" style={{ marginTop: '1.5rem' }}>
                  <FileUpload
                    id="cloud-init-file"
                    type="text"
                    value={cloudInitContent}
                    filename={cloudInitFilename}
                    filenamePlaceholder={t('vmCreate:form.cloudInit.placeholder')}
                    onFileInputChange={(_event, file) => {
                      setCloudInitFilename(file.name)
                      // Read file content
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        const content = e.target?.result as string
                        setCloudInitContent(content || '')
                      }
                      reader.readAsText(file)
                    }}
                    onClearClick={() => {
                      setCloudInitFilename('')
                      setCloudInitContent('')
                    }}
                    browseButtonText={t('vmCreate:form.cloudInit.uploadButton')}
                    hideDefaultPreview
                  />
                </FormGroup>
              )}
            </Form>
          </div>
        )

      case 'hardware':
        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              {t('vmCreate:hardware.title')}
            </Title>
            <Form>

              {/* Machine Size Selection with Sidebar */}
              <FormGroup fieldId="machine-size" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  {/* Left Sidebar - Series Selection */}
                  <div style={{
                    width: '230px',
                    flexShrink: 0,
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px'
                  }}>
                    <Title headingLevel="h4" size="md" style={{ marginBottom: '1rem', fontWeight: 600 }}>
                      {t('vmCreate:hardware.series')}
                    </Title>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div
                        onClick={() => setSelectedSeries('standard')}
                        style={{
                          padding: '0.75rem',
                          backgroundColor: selectedSeries === 'standard' ? '#ffffff' : 'transparent',
                          border: selectedSeries === 'standard' ? '2px solid #0066cc' : '2px solid transparent',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: selectedSeries === 'standard' ? 600 : 400,
                          color: selectedSeries === 'standard' ? '#0066cc' : '#151515',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Standard Series
                      </div>
                      <div
                        onClick={() => setSelectedSeries('highPerformance')}
                        style={{
                          padding: '0.75rem',
                          backgroundColor: selectedSeries === 'highPerformance' ? '#ffffff' : 'transparent',
                          border: selectedSeries === 'highPerformance' ? '2px solid #0066cc' : '2px solid transparent',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: selectedSeries === 'highPerformance' ? 600 : 400,
                          color: selectedSeries === 'highPerformance' ? '#0066cc' : '#151515',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        High-Performance Series
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Size Options */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {machineSizeTiers[selectedSeries].sizes.map((size) => (
                        <Card
                          key={size.id}
                          isSelectable
                          isSelected={selectedSizePreset === size.id}
                          onClick={() => setSelectedSizePreset(size.id)}
                          style={{
                            cursor: 'pointer',
                            border: selectedSizePreset === size.id ? '2px solid #0066cc' : '1px solid #d2d2d2',
                            backgroundColor: selectedSizePreset === size.id ? '#e7f1fa' : '#ffffff',
                            transition: 'all 0.2s ease',
                            minWidth: 'fit-content',
                            padding: '0.75rem 1rem'
                          }}
                        >
                          <CardBody style={{ padding: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <Title headingLevel="h5" size="md" style={{
                                margin: 0,
                                color: selectedSizePreset === size.id ? '#0066cc' : '#151515',
                                fontWeight: selectedSizePreset === size.id ? 700 : 600
                              }}>
                                {size.name}
                              </Title>
                              <div style={{
                                fontSize: '0.8125rem',
                                color: '#6a6e73'
                              }}>
                                {size.description}
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </FormGroup>

              {/* Storage Configuration */}
              <FormGroup
                label={t('vmCreate:form.storage.label')}
                isRequired
                fieldId="storage"
                style={{ marginBottom: '2rem' }}
              >
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Title headingLevel="h4" size="md" style={{ marginBottom: '0.5rem' }}>
                      {t('vmCreate:form.storage.diskSize')}: {formatDiskSize(vmDiskGi)}
                    </Title>
                    <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginBottom: '1rem' }}>
                      {t('vmCreate:form.storage.description')}
                    </div>
                  </div>
                  <div style={{ padding: '0 0.5rem' }}>
                    <Slider
                      value={vmDiskGi}
                      min={50}
                      max={5120}
                      onChange={(_event, value) => {
                        setVmDiskGi(value as number)
                      }}
                      showTicks
                      customSteps={diskSizeOptions}
                      areCustomStepsContinuous={false}
                    />
                  </div>
                </div>
              </FormGroup>

              {/* Run Strategy Dropdown */}
              <FormGroup label={t('vmCreate:form.runStrategy.label')} isRequired fieldId="run-strategy" style={{ marginBottom: '2rem' }}>
                <Dropdown
                  onSelect={(_event, value) => {
                    setVmRunStrategy(String(value))
                    setRunStrategyOpen(false)
                  }}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setRunStrategyOpen(!runStrategyOpen)}
                      isExpanded={runStrategyOpen}
                      style={{ width: '300px' }}
                    >
                      {vmRunStrategy}
                    </MenuToggle>
                  )}
                  isOpen={runStrategyOpen}
                  onOpenChange={(isOpen) => setRunStrategyOpen(isOpen)}
                >
                  <DropdownList>
                    <DropdownItem value="Always" key="always">{t('vmCreate:form.runStrategy.always')}</DropdownItem>
                    <DropdownItem value="RerunOnFailure" key="rerun">{t('vmCreate:form.runStrategy.rerunOnFailure')}</DropdownItem>
                    <DropdownItem value="Manual" key="manual">{t('vmCreate:form.runStrategy.manual')}</DropdownItem>
                    <DropdownItem value="Halted" key="halted">{t('vmCreate:form.runStrategy.halted')}</DropdownItem>
                  </DropdownList>
                </Dropdown>
              </FormGroup>
            </Form>
          </div>
        )

      case 'review':
        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              {t('vmCreate:review.title')}
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <Title headingLevel="h3" size="md" style={{ marginBottom: '0.75rem' }}>
                  {t('vmCreate:steps.vmDetails')}
                </Title>
                <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#6a6e73', marginBottom: '0.5rem' }}>
                    <strong>{t('vmCreate:review.vmName')}:</strong> {vmName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6a6e73', marginBottom: '0.5rem' }}>
                    <strong>{t('vmCreate:form.imageSource.label')}:</strong> {vmImageSource}
                  </div>
                  {sshPublicKey && (
                    <div style={{ fontSize: '0.82rem', color: '#6a6e73', marginBottom: '0.5rem' }}>
                      <strong>{t('vmCreate:review.sshKey')}:</strong> {t('vmCreate:review.configured')}
                    </div>
                  )}
                  {cloudInitFilename && (
                    <div style={{ fontSize: '0.82rem', color: '#6a6e73' }}>
                      <strong>{t('vmCreate:review.cloudInit')}:</strong> {cloudInitFilename}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Title headingLevel="h3" size="md" style={{ marginBottom: '0.75rem' }}>
                  {t('vmCreate:hardware.title')}
                </Title>
                <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#6a6e73', marginBottom: '0.5rem' }}>
                    <strong>{t('vmCreate:review.cpu')}:</strong> {customizeTemplate ? vmCpuCores : (template?.parameters?.find(p => p.name === 'vm_cpu_cores')?.default?.value as string | number || vmCpuCores)}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6a6e73', marginBottom: '0.5rem' }}>
                    <strong>{t('vmCreate:review.memory')}:</strong> {customizeTemplate ? `${vmMemoryGi} Gi` : (template?.parameters?.find(p => p.name === 'vm_memory_size')?.default?.value as string || `${vmMemoryGi} Gi`)}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6a6e73', marginBottom: '0.5rem' }}>
                    <strong>{t('vmCreate:review.disk')}:</strong> {customizeTemplate ? formatDiskSize(vmDiskGi) : (template?.parameters?.find(p => p.name === 'vm_disk_size')?.default?.value as string || formatDiskSize(vmDiskGi))}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6a6e73' }}>
                    <strong>{t('vmCreate:review.runStrategy')}:</strong> {vmRunStrategy}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              {currentStep.name}
            </Title>
            <p style={{ color: '#6a6e73' }}>This step is under construction.</p>
          </div>
        )
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

  if (error && !template) {
    return (
      <AppLayout>
        <PageSection>
          <Alert variant="danger" title={t('vmCreate:errors.error')}>
            {error}
          </Alert>
          <Button variant="primary" onClick={() => navigate(`/${fromPage}`)} style={{ marginTop: '1rem' }}>
            {t('vmCreate:breadcrumbs.templates')}
          </Button>
        </PageSection>
      </AppLayout>
    )
  }

  if (!template) {
    return (
      <AppLayout>
        <PageSection>
          <Alert variant="warning" title={t('vmCreate:errors.templateNotFound')}>
            {t('vmCreate:errors.templateNotFound')}
          </Alert>
          <Button variant="primary" onClick={() => navigate(`/${fromPage}`)} style={{ marginTop: '1rem' }}>
            {t('vmCreate:breadcrumbs.templates')}
          </Button>
        </PageSection>
      </AppLayout>
    )
  }

  // Step indicator sidebar
  const stepIndicator = (
    <SidebarPanel variant="sticky" style={{ width: '280px', backgroundColor: '#f5f5f5', padding: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex
          const isCompleted = step.completed

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                borderRadius: '8px',
                cursor: index < currentStepIndex ? 'pointer' : 'default',
                border: isActive ? '2px solid #0066cc' : 'none',
              }}
              onClick={() => {
                if (index < currentStepIndex) {
                  setCurrentStepIndex(index)
                }
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: isCompleted ? '#3e8635' : isActive ? '#0066cc' : '#d2d2d2',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.75rem',
                flex: '0 0 20px',
              }}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 400,
                color: isActive ? '#151515' : '#6a6e73',
              }}>
                {step.name}
              </div>
            </div>
          )
        })}
      </div>
    </SidebarPanel>
  )

  return (
    <AppLayout>
      <PageSection variant="default" style={{ maxWidth: '800px' }}>
        <Breadcrumb>
          <BreadcrumbItem to={`/${fromPage}`} onClick={(e) => { e.preventDefault(); navigate(`/${fromPage}`); }}>
            {t('vmCreate:breadcrumbs.templates')}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{t('vmCreate:breadcrumbs.vmCreate')}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" size="2xl" style={{ marginTop: '1rem' }}>
          {t('vmCreate:title')}: {template.title || template.id}
        </Title>
        {template.description && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--pf-v6-global--Color--200)',
            marginTop: '0.5rem',
            lineHeight: '1.5'
          }}>
            {template.description}
          </div>
        )}
      </PageSection>

      <PageSection style={{ padding: 0 }}>
        {error && (
          <div style={{ padding: '0 1.5rem' }}>
            <Alert variant="danger" title={t('vmCreate:errors.error')} isInline style={{ marginBottom: '1rem' }}>
              {error}
            </Alert>
          </div>
        )}

        <Sidebar hasGutter>
          {stepIndicator}
          <SidebarContent style={{ padding: '1.5rem' }}>
            <Card>
              <CardBody>
                {renderStepContent()}

                <ActionGroup style={{ marginTop: '2rem' }}>
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    isLoading={creating}
                    isDisabled={!canProceed() || creating}
                    style={{ marginRight: '0.5rem' }}
                  >
                    {currentStepIndex === steps.length - 1 ? (creating ? t('vmCreate:buttons.creating') : t('vmCreate:buttons.create')) : t('vmCreate:buttons.next')}
                  </Button>
                  {currentStepIndex > 0 && (
                    <Button
                      variant="secondary"
                      onClick={handleBack}
                      isDisabled={creating}
                      style={{ marginRight: '0.5rem' }}
                    >
                      {t('vmCreate:buttons.back')}
                    </Button>
                  )}
                  <Button
                    variant="link"
                    onClick={() => navigate(`/${fromPage}`)}
                    isDisabled={creating}
                  >
                    {t('vmCreate:buttons.cancel')}
                  </Button>
                </ActionGroup>
              </CardBody>
            </Card>
          </SidebarContent>
        </Sidebar>
      </PageSection>
    </AppLayout>
  )
}

export default VirtualMachineCreate
