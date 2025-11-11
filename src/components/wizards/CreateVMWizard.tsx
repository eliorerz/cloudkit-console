import { useState } from 'react'
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  TextInput,
  Title,
  Card,
  CardBody,
  Radio,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
  TextArea,
  NumberInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Alert,
  AlertVariant,
  InputGroup,
  InputGroupItem,
  Checkbox,
  Spinner,
} from '@patternfly/react-core'
import { Template, TemplateParameter } from '../../api/types'

interface CreateVMWizardProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (vmId: string, templateId: string, parameters: Record<string, any>) => Promise<void>
  templates: Template[]
}

interface WizardStep {
  id: string
  name: string
  category?: string
}

export const CreateVMWizard: React.FC<CreateVMWizardProps> = ({
  isOpen,
  onClose,
  onCreate,
  templates,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [useTemplate, setUseTemplate] = useState(true)
  const [vmId, setVmId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
  const [templateParameters, setTemplateParameters] = useState<Record<string, any>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [cloudInitConfig, setCloudInitConfig] = useState('')
  const [customizeTemplate, setCustomizeTemplate] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)

  // Hardware configuration fields (not in template)
  const [vmCpuCores, setVmCpuCores] = useState(2)
  const [vmMemoryGi, setVmMemoryGi] = useState(4)  // Store as numeric Gi
  const [vmDiskGi, setVmDiskGi] = useState(50)     // Store as numeric Gi
  const [vmRunStrategy, setVmRunStrategy] = useState('Always')

  // Dropdown states for enhanced UI
  const [osTypeDropdownOpen, setOsTypeDropdownOpen] = useState(false)
  const [runStrategyDropdownOpen, setRunStrategyDropdownOpen] = useState(false)
  const [memoryUnitDropdownOpen, setMemoryUnitDropdownOpen] = useState(false)
  const [diskUnitDropdownOpen, setDiskUnitDropdownOpen] = useState(false)
  const [networkTypeDropdownOpen, setNetworkTypeDropdownOpen] = useState(false)

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  // Helper to convert snake_case to user-friendly labels
  const formatLabel = (paramName: string): string => {
    // Special cases for common VM parameters
    const labelMap: Record<string, string> = {
      'vm_name': 'Virtual Machine Name',
      'vm_os_type': 'Operating System Type',
      'vm_cpu_cores': 'CPU Cores',
      'vm_memory_size': 'Memory Size',
      'vm_disk_size': 'Disk Size',
      'vm_run_strategy': 'Run Strategy',
      'vm_network_type': 'Network Type',
      'vm_image_source': 'Image Source',
      'ssh_public_key': 'SSH Public Key',
      'cloud_init_config': 'Cloud-init Configuration',
    }

    // Return mapped label if exists
    if (labelMap[paramName]) {
      return labelMap[paramName]
    }

    // Otherwise convert snake_case to Title Case
    return paramName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Helper to parse memory/disk strings like "4Gi" into value + unit
  const parseResourceString = (str: string): { value: number; unit: string } => {
    const match = str?.match(/^(\d+(?:\.\d+)?)(Mi|Gi|Ti)?$/i)
    if (match) {
      return { value: parseFloat(match[1]), unit: match[2] || 'Gi' }
    }
    return { value: 0, unit: 'Gi' }
  }

  // Helper to combine value + unit
  const formatResourceString = (value: number, unit: string): string => {
    return `${value}${unit}`
  }

  // Categorize parameters
  const categorizeParameters = (parameters: TemplateParameter[]) => {
    const categories: Record<string, TemplateParameter[]> = {
      general: [],
      hardware: [],
      network: [],
      storage: [],
      cloudInit: [],
      other: [],
    }

    parameters.forEach(param => {
      const name = param.name.toLowerCase()
      const title = (param.title || '').toLowerCase()

      // Skip vm_name - we use vmId from the wizard step instead
      if (name === 'vm_name') {
        return
      }

      // Skip cloud_init_config - it will be handled separately
      if (name.includes('cloud_init_config') || name.includes('cloud-init-config')) {
        categories.cloudInit.push(param)
      }
      // Hardware-related
      else if (name.includes('cpu') || name.includes('memory') || name.includes('ram') ||
          name.includes('core') || name.includes('vcpu') ||
          title.includes('cpu') || title.includes('memory') || title.includes('core')) {
        categories.hardware.push(param)
      }
      // Network-related
      else if (name.includes('network') || name.includes('ip') || name.includes('mac') ||
               name.includes('interface') || name.includes('vlan') ||
               title.includes('network') || title.includes('ip')) {
        categories.network.push(param)
      }
      // Storage-related
      else if (name.includes('disk') || name.includes('storage') || name.includes('volume') ||
               name.includes('image') ||
               title.includes('disk') || title.includes('storage') || title.includes('image')) {
        categories.storage.push(param)
      }
      // General
      else if (name.includes('name') || name.includes('os') || name.includes('description') ||
               name.includes('ssh') ||
               title.includes('name') || title.includes('ssh')) {
        categories.general.push(param)
      }
      else {
        categories.other.push(param)
      }
    })

    return categories
  }

  // Build dynamic steps based on template
  const getSteps = (): WizardStep[] => {
    const steps: WizardStep[] = [
      { id: 'method', name: 'Creation method' },
    ]

    if (!useTemplate) {
      return steps
    }

    if (!selectedTemplateId || !selectedTemplate) {
      return steps
    }

    // Only add customization steps if user wants to customize the template
    if (customizeTemplate) {
      steps.push({ id: 'vmname', name: 'VM name' })
      const categorized = categorizeParameters(selectedTemplate.parameters || [])

      // Only show Hardware Configuration step if template has hardware parameters
      const hasHardwareParams = selectedTemplate.parameters?.some(p =>
        ['cpu_count', 'vm_cpu_cores', 'cpus', 'memory_gb', 'vm_memory_size', 'memory',
         'disk_size_gb', 'vm_disk_size', 'disk_size', 'run_strategy', 'vm_run_strategy'].includes(p.name)
      )
      if (hasHardwareParams) {
        steps.push({ id: 'hardware-config', name: 'Hardware Configuration' })
      }

      if (categorized.general.length > 0) {
        steps.push({ id: 'general', name: 'General', category: 'general' })
      }
      if (categorized.hardware.length > 0) {
        steps.push({ id: 'hardware', name: 'Additional Hardware', category: 'hardware' })
      }
      if (categorized.network.length > 0) {
        steps.push({ id: 'network', name: 'Network', category: 'network' })
      }
      if (categorized.storage.length > 0) {
        steps.push({ id: 'storage', name: 'Storage', category: 'storage' })
      }
      if (categorized.cloudInit.length > 0) {
        steps.push({ id: 'cloudinit', name: 'Cloud-init', category: 'cloudInit' })
      }
      if (categorized.other.length > 0) {
        steps.push({ id: 'other', name: 'Other', category: 'other' })
      }
    }

    steps.push({ id: 'review', name: 'Review' })

    return steps
  }

  const steps = getSteps()
  const currentStep = steps[currentStepIndex]

  // Calculate progress more intelligently
  // Use a minimum of 5 steps for progress calculation when template not yet selected
  const getProgressSteps = () => {
    if (!selectedTemplateId) {
      return Math.max(steps.length, 5) // Assume minimum 5 steps before template is selected
    }
    return steps.length
  }

  const progressValue = ((currentStepIndex + 1) / getProgressSteps()) * 100

  const handleClose = () => {
    if (!isCreating) {
      setCurrentStepIndex(0)
      setVmId('')
      setSelectedTemplateId('')
      setTemplateParameters({})
      setCloudInitConfig('')
      setUseTemplate(true)
      setCustomizeTemplate(false)
      setCreationError(null)
      // Reset hardware configuration to defaults
      setVmCpuCores(2)
      setVmMemoryGi(4)
      setVmDiskGi(50)
      setVmRunStrategy('Always')
      onClose()
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setTemplateDropdownOpen(false)

    const template = templates.find(t => t.id === templateId)
    if (template?.parameters) {
      const defaults: Record<string, any> = {}
      template.parameters.forEach(param => {
        if (param.default?.value !== undefined) {
          defaults[param.name] = param.default.value
        }
      })
      setTemplateParameters(defaults)
    } else {
      setTemplateParameters({})
    }
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  // Helper to check if template supports a hardware parameter
  const templateSupportsParam = (paramNames: string[]): boolean => {
    if (!selectedTemplate?.parameters) return false
    return selectedTemplate.parameters.some(p => paramNames.includes(p.name))
  }

  const handleCreate = async () => {
    try {
      setIsCreating(true)
      setCreationError(null)

      // Build parameter overrides - only include values that differ from defaults
      // The fulfillment service will merge these with template defaults
      const vmParameters: Record<string, any> = {}

      // VM name is always required
      vmParameters.vm_name = vmId

      // Only include customized parameters if user chose to customize
      if (customizeTemplate) {
        // Map UI state to template parameter names and add only if customized

        // Hardware configuration
        if (templateSupportsParam(['vm_cpu_cores', 'cpu_count', 'cpus'])) {
          const defaultCpu = 2
          if (vmCpuCores !== defaultCpu) {
            vmParameters.vm_cpu_cores = vmCpuCores
          }
        }

        if (templateSupportsParam(['vm_memory_size', 'memory_gb', 'memory', 'vm_memory'])) {
          const defaultMemory = 4
          if (vmMemoryGi !== defaultMemory) {
            vmParameters.vm_memory_size = `${vmMemoryGi}Gi`
          }
        }

        if (templateSupportsParam(['vm_disk_size', 'disk_size_gb', 'disk_size'])) {
          const defaultDisk = 50
          if (vmDiskGi !== defaultDisk) {
            vmParameters.vm_disk_size = `${vmDiskGi}Gi`
          }
        }

        if (templateSupportsParam(['vm_run_strategy', 'run_strategy'])) {
          const defaultRunStrategy = 'Always'
          if (vmRunStrategy !== defaultRunStrategy) {
            vmParameters.vm_run_strategy = vmRunStrategy
          }
        }

        // Cloud-init configuration
        if (cloudInitConfig && cloudInitConfig.trim() !== '') {
          vmParameters.cloud_init_config = cloudInitConfig
        }

        // Additional user-configured parameters from templateParameters
        if (selectedTemplate?.parameters) {
          selectedTemplate.parameters.forEach(param => {
            // Skip parameters we've already handled
            if (['vm_name', 'vm_cpu_cores', 'vm_memory_size', 'vm_disk_size', 'vm_run_strategy', 'cloud_init_config'].includes(param.name)) {
              return
            }

            // Include parameter if user provided a value
            const userValue = templateParameters[param.name]
            if (userValue !== undefined && userValue !== null && userValue !== '') {
              vmParameters[param.name] = userValue
            }
          })
        }
      }

      // Create VM with parameter overrides
      // The fulfillment service will merge these with template defaults
      await onCreate(vmId, selectedTemplateId, vmParameters)

      handleClose()
    } catch (error) {
      console.error('Failed to create VM:', error)
      setCreationError(error instanceof Error ? error.message : 'Failed to create VM')
    } finally {
      setIsCreating(false)
    }
  }

  const canProceed = () => {
    switch (currentStep?.id) {
      case 'method':
        // If using template, require template selection; otherwise allow proceed
        return useTemplate ? !!selectedTemplateId : true
      case 'template':
        return !!selectedTemplateId
      case 'vmname':
        // Validate VM name: must be non-empty and follow Kubernetes naming conventions
        if (!vmId) return false
        // Basic validation: lowercase alphanumeric and hyphens only
        const vmNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
        return vmNameRegex.test(vmId)
      case 'hardware':
      case 'general':
      case 'network':
      case 'storage':
      case 'other':
        // Check that all required parameters in this category have values
        if (!selectedTemplate?.parameters) return true
        const categorized = categorizeParameters(selectedTemplate.parameters)
        const categoryParams = categorized[currentStep.category!] || []
        return categoryParams
          .filter(p => p.required)
          .every(p => {
            const value = templateParameters[p.name]
            return value !== undefined && value !== null && value !== ''
          })
      default:
        return true
    }
  }

  const renderParameterFields = (params: TemplateParameter[]) => (
    <>
      {params.map((param) => {
        const paramName = param.name.toLowerCase()

        // CPU cores - number input
        if (paramName.includes('cpu') && (paramName.includes('core') || paramName === 'vm_cpu_cores')) {
          return (
            <FormGroup
              key={param.name}
              label={param.title || 'CPU Cores'}
              isRequired={param.required}
              fieldId={`param-${param.name}`}
            >
              <NumberInput
                value={parseInt(templateParameters[param.name]) || parseInt(param.default?.value) || 2}
                min={1}
                max={64}
                onMinus={() => {
                  const current = parseInt(templateParameters[param.name]) || 2
                  if (current > 1) {
                    setTemplateParameters({ ...templateParameters, [param.name]: current - 1 })
                  }
                }}
                onPlus={() => {
                  const current = parseInt(templateParameters[param.name]) || 2
                  if (current < 64) {
                    setTemplateParameters({ ...templateParameters, [param.name]: current + 1 })
                  }
                }}
                onChange={(event) => {
                  const value = (event.target as HTMLInputElement).value
                  const num = parseInt(value)
                  if (!isNaN(num) && num >= 1 && num <= 64) {
                    setTemplateParameters({ ...templateParameters, [param.name]: num })
                  }
                }}
                inputAriaLabel="CPU cores"
                widthChars={10}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{param.description || 'Number of virtual CPU cores (1-64)'}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )
        }

        // Memory size - number + unit dropdown
        if (paramName.includes('memory') || paramName.includes('ram') || paramName === 'vm_memory_size') {
          const currentValue = templateParameters[param.name] || param.default?.value || '4Gi'
          const parsed = parseResourceString(currentValue)

          return (
            <FormGroup
              key={param.name}
              label={param.title || 'Memory Size'}
              isRequired={param.required}
              fieldId={`param-${param.name}`}
            >
              <InputGroup>
                <InputGroupItem>
                  <TextInput
                    type="number"
                    value={parsed.value}
                    onChange={(_event, value) => {
                      const num = parseFloat(value) || 0
                      setTemplateParameters({
                        ...templateParameters,
                        [param.name]: formatResourceString(num, parsed.unit)
                      })
                    }}
                    style={{ width: '150px' }}
                    aria-label="Memory value"
                  />
                </InputGroupItem>
                <InputGroupItem>
                  <Dropdown
                    isOpen={memoryUnitDropdownOpen}
                    onSelect={(_, value) => {
                      setTemplateParameters({
                        ...templateParameters,
                        [param.name]: formatResourceString(parsed.value, value as string)
                      })
                      setMemoryUnitDropdownOpen(false)
                    }}
                    onOpenChange={(isOpen) => setMemoryUnitDropdownOpen(isOpen)}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setMemoryUnitDropdownOpen(!memoryUnitDropdownOpen)}
                        isExpanded={memoryUnitDropdownOpen}
                      >
                        {parsed.unit}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      <DropdownItem value="Mi">Mi</DropdownItem>
                      <DropdownItem value="Gi">Gi</DropdownItem>
                      <DropdownItem value="Ti">Ti</DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </InputGroupItem>
              </InputGroup>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{param.description || 'Memory size (e.g., 4Gi, 8Gi, 16Gi)'}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )
        }

        // Disk size - number + unit dropdown
        if (paramName.includes('disk') && paramName.includes('size') || paramName === 'vm_disk_size') {
          const currentValue = templateParameters[param.name] || param.default?.value || '50Gi'
          const parsed = parseResourceString(currentValue)

          return (
            <FormGroup
              key={param.name}
              label={param.title || 'Disk Size'}
              isRequired={param.required}
              fieldId={`param-${param.name}`}
            >
              <InputGroup>
                <InputGroupItem>
                  <TextInput
                    type="number"
                    value={parsed.value}
                    onChange={(_event, value) => {
                      const num = parseFloat(value) || 0
                      setTemplateParameters({
                        ...templateParameters,
                        [param.name]: formatResourceString(num, parsed.unit)
                      })
                    }}
                    style={{ width: '150px' }}
                    aria-label="Disk size value"
                  />
                </InputGroupItem>
                <InputGroupItem>
                  <Dropdown
                    isOpen={diskUnitDropdownOpen}
                    onSelect={(_, value) => {
                      setTemplateParameters({
                        ...templateParameters,
                        [param.name]: formatResourceString(parsed.value, value as string)
                      })
                      setDiskUnitDropdownOpen(false)
                    }}
                    onOpenChange={(isOpen) => setDiskUnitDropdownOpen(isOpen)}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setDiskUnitDropdownOpen(!diskUnitDropdownOpen)}
                        isExpanded={diskUnitDropdownOpen}
                      >
                        {parsed.unit}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      <DropdownItem value="Gi">Gi</DropdownItem>
                      <DropdownItem value="Ti">Ti</DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </InputGroupItem>
              </InputGroup>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{param.description || 'Root disk size (e.g., 50Gi, 100Gi)'}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )
        }

        // Run strategy - dropdown with predefined options
        if (paramName.includes('run') && paramName.includes('strategy') || paramName === 'vm_run_strategy') {
          const runStrategyOptions = [
            { value: 'Always', description: 'VM should always be running' },
            { value: 'Manual', description: 'User controls VM start/stop' },
            { value: 'RerunOnFailure', description: 'Restart VM if it fails' },
            { value: 'Halted', description: 'VM should be stopped' },
          ]

          return (
            <FormGroup
              key={param.name}
              label={param.title || 'Run Strategy'}
              isRequired={param.required}
              fieldId={`param-${param.name}`}
            >
              <Dropdown
                isOpen={runStrategyDropdownOpen}
                onSelect={(_, value) => {
                  setTemplateParameters({ ...templateParameters, [param.name]: value as string })
                  setRunStrategyDropdownOpen(false)
                }}
                onOpenChange={(isOpen) => setRunStrategyDropdownOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setRunStrategyDropdownOpen(!runStrategyDropdownOpen)}
                    isExpanded={runStrategyDropdownOpen}
                    style={{ width: '100%' }}
                  >
                    {templateParameters[param.name] || param.default?.value || 'Select run strategy'}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  {runStrategyOptions.map((option) => (
                    <DropdownItem key={option.value} value={option.value}>
                      <div>
                        <strong>{option.value}</strong>
                        <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                          {option.description}
                        </div>
                      </div>
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{param.description || 'How the VM should be started and maintained'}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )
        }

        // OS type - dropdown
        if (param.name === 'vm_os_type') {
          const osTypes = ['linux', 'windows', 'other']
          const selectedOsType = templateParameters[param.name] || param.default?.value
          return (
            <FormGroup
              key={param.name}
              label={param.title || 'Operating System Type'}
              isRequired={param.required}
              fieldId={`param-${param.name}`}
            >
              <Dropdown
                isOpen={osTypeDropdownOpen}
                onSelect={(_, value) => {
                  setTemplateParameters({ ...templateParameters, [param.name]: value as string })
                  setOsTypeDropdownOpen(false)
                }}
                onOpenChange={(isOpen) => setOsTypeDropdownOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setOsTypeDropdownOpen(!osTypeDropdownOpen)}
                    isExpanded={osTypeDropdownOpen}
                    style={{ width: '100%' }}
                  >
                    {selectedOsType
                      ? selectedOsType.charAt(0).toUpperCase() + selectedOsType.slice(1)
                      : 'Select OS type'}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  {osTypes.map((os) => (
                    <DropdownItem key={os} value={os}>
                      {os.charAt(0).toUpperCase() + os.slice(1)}
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{param.description || 'OS type for optimization'}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )
        }

        // Network type - for vm_network_type parameter
        if (paramName.includes('network') && paramName.includes('type') || paramName === 'vm_network_type') {
          const networkTypes = ['pod', 'bridge', 'masquerade']
          const selectedNetworkType = templateParameters[param.name] || param.default?.value
          return (
            <FormGroup
              key={param.name}
              label={param.title || 'Network Type'}
              isRequired={param.required}
              fieldId={`param-${param.name}`}
            >
              <Dropdown
                isOpen={networkTypeDropdownOpen}
                onSelect={(_, value) => {
                  setTemplateParameters({ ...templateParameters, [param.name]: value as string })
                  setNetworkTypeDropdownOpen(false)
                }}
                onOpenChange={(isOpen) => setNetworkTypeDropdownOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setNetworkTypeDropdownOpen(!networkTypeDropdownOpen)}
                    isExpanded={networkTypeDropdownOpen}
                    style={{ width: '100%' }}
                  >
                    {selectedNetworkType
                      ? selectedNetworkType.charAt(0).toUpperCase() + selectedNetworkType.slice(1)
                      : 'Select network type'}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  {networkTypes.map((type) => (
                    <DropdownItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{param.description || 'Network attachment type'}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )
        }

        // Default text input for other parameters
        // For TextArea fields (ssh_public_key, etc.)
        if (paramName.includes('ssh') && paramName.includes('key')) {
          return (
            <FormGroup
              key={param.name}
              label={param.title || formatLabel(param.name)}
              isRequired={param.required}
              fieldId={`param-${param.name}`}
            >
              <TextArea
                isRequired={param.required}
                id={`param-${param.name}`}
                value={templateParameters[param.name] || ''}
                onChange={(_event, value) =>
                  setTemplateParameters({ ...templateParameters, [param.name]: value })
                }
                placeholder={param.default?.value || 'ssh-rsa AAAA...'}
                rows={5}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{param.description || ''}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )
        }

        return (
          <FormGroup
            key={param.name}
            label={param.title || formatLabel(param.name)}
            isRequired={param.required}
            fieldId={`param-${param.name}`}
          >
            <TextInput
              isRequired={param.required}
              type="text"
              id={`param-${param.name}`}
              value={templateParameters[param.name] || ''}
              onChange={(_event, value) =>
                setTemplateParameters({ ...templateParameters, [param.name]: value })
              }
              placeholder={param.default?.value || ''}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{param.description || ''}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        )
      })}
    </>
  )

  const renderStepContent = () => {
    if (!currentStep) return null

    switch (currentStep.id) {
      case 'method':
        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              How would you like to create your virtual machine?
            </Title>
            <Grid hasGutter>
              <GridItem span={6}>
                <Card
                  isSelectable
                  isSelected={useTemplate}
                  onClick={() => setUseTemplate(true)}
                  style={{ cursor: 'pointer', height: '100%' }}
                >
                  <CardBody>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Radio
                        id="use-template"
                        name="creation-method"
                        isChecked={useTemplate}
                        onChange={() => setUseTemplate(true)}
                      />
                      <Title headingLevel="h3" size="lg" style={{ margin: 0 }}>
                        Use a template
                      </Title>
                    </div>
                    <p style={{ color: '#6a6e73', marginLeft: '2rem' }}>
                      Choose from pre-configured templates with recommended settings for common use cases. Recommended for most users.
                    </p>
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem span={6}>
                <Card
                  isSelectable
                  isSelected={!useTemplate}
                  onClick={() => setUseTemplate(false)}
                  style={{ cursor: 'pointer', height: '100%' }}
                >
                  <CardBody>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Radio
                        id="create-manual"
                        name="creation-method"
                        isChecked={!useTemplate}
                        onChange={() => setUseTemplate(false)}
                      />
                      <Title headingLevel="h3" size="lg" style={{ margin: 0 }}>
                        Create manually
                      </Title>
                    </div>
                    <p style={{ color: '#6a6e73', marginLeft: '2rem' }}>
                      Configure all settings manually for advanced customization. For advanced users.
                    </p>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>

            {/* Show template selection if "Use a template" is selected */}
            {useTemplate && (
              <Form style={{ marginTop: '2rem' }}>
                <FormGroup label="Template" isRequired fieldId="template">
                  <Dropdown
                    isOpen={templateDropdownOpen}
                    onSelect={(_, value) => handleTemplateSelect(value as string)}
                    onOpenChange={(isOpen) => setTemplateDropdownOpen(isOpen)}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                        isExpanded={templateDropdownOpen}
                        style={{ width: '100%' }}
                      >
                        {selectedTemplateId
                          ? templates.find(t => t.id === selectedTemplateId)?.title || selectedTemplateId
                          : 'Select a template'}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {templates.map((template) => (
                        <DropdownItem key={template.id} value={template.id}>
                          <div>
                            <strong>{template.title || template.id}</strong>
                            {template.description && (
                              <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                                {template.description.split('\n')[0]}
                              </div>
                            )}
                          </div>
                        </DropdownItem>
                      ))}
                    </DropdownList>
                  </Dropdown>
                </FormGroup>
                {selectedTemplate?.description && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                    <Title headingLevel="h4" size="md" style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      About this template
                    </Title>
                    <p style={{ color: '#6a6e73', whiteSpace: 'pre-wrap', fontSize: '0.875rem', margin: 0 }}>{selectedTemplate.description}</p>
                  </div>
                )}
                {selectedTemplateId && (
                  <FormGroup fieldId="customize-template" style={{ marginTop: '1.5rem' }}>
                    <Checkbox
                      id="customize-template"
                      label="Customize template parameters"
                      description="Configure hardware, network, and other VM settings. If unchecked, the VM will be created with default template settings and an auto-generated name."
                      isChecked={customizeTemplate}
                      onChange={(_event, checked) => setCustomizeTemplate(checked)}
                    />
                  </FormGroup>
                )}
              </Form>
            )}
          </div>
        )

      case 'template':
        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              Select a template
            </Title>
            <FormGroup label="Template" isRequired fieldId="template">
              <Dropdown
                isOpen={templateDropdownOpen}
                onSelect={(_, value) => handleTemplateSelect(value as string)}
                onOpenChange={(isOpen) => setTemplateDropdownOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                    isExpanded={templateDropdownOpen}
                    style={{ width: '100%' }}
                  >
                    {selectedTemplateId
                      ? templates.find(t => t.id === selectedTemplateId)?.title || selectedTemplateId
                      : 'Select a template'}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  {templates.map((template) => (
                    <DropdownItem key={template.id} value={template.id}>
                      <div>
                        <strong>{template.title || template.id}</strong>
                        {template.description && (
                          <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                            {template.description.split('\n')[0]}
                          </div>
                        )}
                      </div>
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
            </FormGroup>
            {selectedTemplate?.description && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <Title headingLevel="h4" size="md" style={{ marginBottom: '0.5rem' }}>
                  About this template
                </Title>
                <p style={{ color: '#6a6e73', whiteSpace: 'pre-wrap' }}>{selectedTemplate.description}</p>
              </div>
            )}
          </Form>
        )

      case 'vmname':
        const vmNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
        const isVmNameValid = !vmId || vmNameRegex.test(vmId)

        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              Name your virtual machine
            </Title>
            <FormGroup label="Virtual machine name" isRequired fieldId="vm-name">
              <TextInput
                isRequired
                type="text"
                id="vm-name"
                value={vmId}
                onChange={(_event, value) => setVmId(value.toLowerCase())}
                placeholder="e.g., my-fedora-vm"
                validated={vmId && !isVmNameValid ? 'error' : 'default'}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={vmId && !isVmNameValid ? 'error' : 'default'}>
                    {vmId && !isVmNameValid
                      ? 'Name must contain only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.'
                      : 'A unique identifier for your virtual machine (lowercase letters, numbers, and hyphens)'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </Form>
        )

      case 'hardware-config':
        return (
          <div>
            <Title headingLevel="h2" size="xl">
              Hardware Configuration
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '1.5rem', fontSize: '0.95rem', marginTop: 0 }}>
              Define the hardware resources allocated to your VM including CPU, memory, disk space, and run strategy.
            </p>

            <Card>
              <CardBody>
                <Form>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* CPU Cores */}
              {templateSupportsParam(['cpu_count', 'vm_cpu_cores', 'cpus']) && (
              <div style={{ flex: 1, minWidth: '200px' }}>
                <FormGroup label="CPU Cores" isRequired fieldId="vm-cpu-cores">
                  <div className="pf-v6-c-number-input-custom">
                    <NumberInput
                      value={vmCpuCores}
                      min={1}
                      max={64}
                      onMinus={() => vmCpuCores > 1 && setVmCpuCores(vmCpuCores - 1)}
                      onPlus={() => vmCpuCores < 64 && setVmCpuCores(vmCpuCores + 1)}
                      onChange={(event) => {
                        const value = (event.target as HTMLInputElement).value
                        const num = parseInt(value)
                        if (!isNaN(num) && num >= 1 && num <= 64) {
                          setVmCpuCores(num)
                        }
                      }}
                      inputAriaLabel="CPU cores"
                      widthChars={14}
                    />
                  </div>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>Number of virtual CPU cores (1-64)</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  <style>{`
                    .pf-v6-c-number-input-custom .pf-v6-c-number-input__input {
                      text-align: center !important;
                      line-height: 1.5;
                      padding-top: 0.25rem;
                      padding-bottom: 0.25rem;
                    }
                    .pf-v6-c-number-input-custom input[type="number"] {
                      text-align: center !important;
                    }
                  `}</style>
                </FormGroup>
              </div>
              )}

              {/* Memory Size (Gi) */}
              {templateSupportsParam(['memory_gb', 'vm_memory_size', 'memory']) && (
              <div style={{ flex: 1, minWidth: '200px' }}>
                <FormGroup label="Memory Size (Gi)" isRequired fieldId="vm-memory-size">
                  <div className="pf-v6-c-number-input-custom">
                    <NumberInput
                      value={vmMemoryGi}
                      min={1}
                      max={1024}
                      onMinus={() => vmMemoryGi > 1 && setVmMemoryGi(vmMemoryGi - 1)}
                      onPlus={() => vmMemoryGi < 1024 && setVmMemoryGi(vmMemoryGi + 1)}
                      onChange={(event) => {
                        const value = (event.target as HTMLInputElement).value
                        const num = parseInt(value)
                        if (!isNaN(num) && num >= 1 && num <= 1024) {
                          setVmMemoryGi(num)
                        }
                      }}
                      inputAriaLabel="Memory size in Gi"
                      widthChars={14}
                    />
                  </div>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>Amount of RAM allocated to the VM (1-1024 Gi)</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </div>
              )}

              {/* Disk Size (Gi) */}
              {templateSupportsParam(['disk_size_gb', 'vm_disk_size', 'disk_size']) && (
              <div style={{ flex: 1, minWidth: '200px' }}>
                <FormGroup label="Disk Size (Gi)" isRequired fieldId="vm-disk-size">
                  <div className="pf-v6-c-number-input-custom">
                    <NumberInput
                      value={vmDiskGi}
                      min={1}
                      max={10240}
                      onMinus={() => vmDiskGi > 1 && setVmDiskGi(vmDiskGi - 1)}
                      onPlus={() => vmDiskGi < 10240 && setVmDiskGi(vmDiskGi + 1)}
                      onChange={(event) => {
                        const value = (event.target as HTMLInputElement).value
                        const num = parseInt(value)
                        if (!isNaN(num) && num >= 1 && num <= 10240) {
                          setVmDiskGi(num)
                        }
                      }}
                      inputAriaLabel="Disk size in Gi"
                      widthChars={14}
                    />
                  </div>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>Size of the root disk (1-10240 Gi)</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </div>
              )}
            </div>

                  {/* Run Strategy */}
                  {templateSupportsParam(['run_strategy', 'vm_run_strategy']) && (
                  <FormGroup label="Run Strategy" isRequired fieldId="vm-run-strategy" style={{ marginTop: '1rem' }}>
                    <Dropdown
                      isOpen={runStrategyDropdownOpen}
                      onSelect={() => setRunStrategyDropdownOpen(false)}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setRunStrategyDropdownOpen(!runStrategyDropdownOpen)}
                          style={{ minWidth: '200px' }}
                        >
                          {vmRunStrategy}
                        </MenuToggle>
                      )}
                    >
                      <DropdownList>
                        <DropdownItem value="Always" onClick={() => setVmRunStrategy('Always')}>
                          <div>
                            <div style={{ fontWeight: 600 }}>Always</div>
                            <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>VM should always be running</div>
                          </div>
                        </DropdownItem>
                        <DropdownItem value="Manual" onClick={() => setVmRunStrategy('Manual')}>
                          <div>
                            <div style={{ fontWeight: 600 }}>Manual</div>
                            <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>User controls VM start/stop</div>
                          </div>
                        </DropdownItem>
                        <DropdownItem value="RerunOnFailure" onClick={() => setVmRunStrategy('RerunOnFailure')}>
                          <div>
                            <div style={{ fontWeight: 600 }}>RerunOnFailure</div>
                            <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Restart VM if it fails</div>
                          </div>
                        </DropdownItem>
                        <DropdownItem value="Halted" onClick={() => setVmRunStrategy('Halted')}>
                          <div>
                            <div style={{ fontWeight: 600 }}>Halted</div>
                            <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>VM should be stopped</div>
                          </div>
                        </DropdownItem>
                      </DropdownList>
                    </Dropdown>
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>Determines how the VM should be managed</HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                  )}
                </Form>
              </CardBody>
            </Card>
          </div>
        )

      case 'cloudinit':
        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.25rem' }}>
              Cloud-init Configuration
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '0.75rem' }}>
              Configure cloud-init for VM initialization. You can include user data, network config, etc.
            </p>
            <FormGroup label="Cloud-init configuration" fieldId="cloud-init-config">
              <TextArea
                id="cloud-init-config"
                value={cloudInitConfig || templateParameters.cloud_init_config || ''}
                onChange={(_event, value) => setCloudInitConfig(value)}
                rows={15}
                placeholder="#cloud-config&#10;users:&#10;  - name: admin&#10;    ssh-authorized-keys:&#10;      - ssh-rsa AAAA..."
                style={{ fontFamily: 'monospace' }}
              />
              <p style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                YAML format cloud-init configuration
              </p>
            </FormGroup>
          </Form>
        )

      case 'general':
      case 'hardware':
      case 'network':
      case 'storage':
      case 'other':
        if (!selectedTemplate?.parameters) return null
        const categorized = categorizeParameters(selectedTemplate.parameters)
        const categoryParams = categorized[currentStep.category!] || []

        if (categoryParams.length === 0) return null

        // Add helpful descriptions for each category
        const categoryDescriptions: Record<string, string> = {
          general: 'Configure basic settings for your virtual machine including name, OS type, and SSH keys.',
          hardware: 'Define the hardware resources allocated to your VM including CPU, memory, and disk space.',
          network: 'Configure network settings including interfaces, IP addresses, and network types.',
          storage: 'Set up storage configuration including disk images, sizes, and storage classes.',
          other: 'Additional configuration options for your virtual machine.',
        }

        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.25rem' }}>
              {currentStep.name} Configuration
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              {categoryDescriptions[currentStep.category!] || 'Configure settings for your virtual machine.'}
            </p>
            {currentStep.category === 'hardware' && (
              <Alert
                variant={AlertVariant.info}
                isInline
                title="Resource allocation"
                style={{ marginBottom: '1.5rem' }}
              >
                Configure the compute resources for your VM. Ensure the values match your workload requirements.
              </Alert>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {renderParameterFields(categoryParams)}
            </div>
          </Form>
        )

      case 'review':
        // Group parameters by category for better display
        const categorizedForReview = selectedTemplate?.parameters
          ? categorizeParameters(selectedTemplate.parameters)
          : { general: [], hardware: [], network: [], storage: [], cloudInit: [], other: [] }

        const getDisplayValue = (_key: string, value: any) => {
          if (value === undefined || value === null || value === '') {
            return <span style={{ color: '#6a6e73', fontStyle: 'italic' }}>(not set)</span>
          }
          return String(value)
        }

        const renderCategorySection = (categoryName: string, categoryLabel: string, params: TemplateParameter[]) => {
          const categoryValues = params
            .map(p => ({ name: p.name, title: p.title || formatLabel(p.name), value: templateParameters[p.name] }))
            .filter(p => p.value !== undefined && p.value !== '' && p.value !== null)

          if (categoryValues.length === 0) return null

          return (
            <div key={categoryName} style={{ marginBottom: '1.5rem' }}>
              <Title headingLevel="h4" size="md" style={{ marginBottom: '0.75rem', color: '#151515' }}>
                {categoryLabel}
              </Title>
              <DescriptionList isHorizontal isCompact>
                {categoryValues.map(({ name, title, value }) => (
                  <DescriptionListGroup key={name}>
                    <DescriptionListTerm style={{ minWidth: '150px', flex: '0 0 auto' }}>{title}</DescriptionListTerm>
                    <DescriptionListDescription style={{ wordWrap: 'break-word', flex: '1 1 auto' }}>
                      {getDisplayValue(name, value)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ))}
              </DescriptionList>
            </div>
          )
        }

        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.75rem' }}>
              Review your configuration
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Please review all settings before creating your virtual machine.
            </p>

            {/* Show creation progress */}
            {isCreating && (
              <Alert
                variant={AlertVariant.info}
                isInline
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Spinner size="md" />
                    <span>Creating virtual machine...</span>
                  </div>
                }
                style={{ marginBottom: '1.5rem' }}
              />
            )}

            {/* Show error if creation failed */}
            {creationError && (
              <Alert
                variant={AlertVariant.danger}
                isInline
                title="Failed to create virtual machine"
                style={{ marginBottom: '1.5rem' }}
              >
                {creationError}
              </Alert>
            )}

            <Card style={{ marginBottom: '1.5rem' }}>
              <CardBody>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div style={{ flex: '1 1 auto' }}>
                    {/* Left column - Basic Information and Other Settings */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <Title headingLevel="h4" size="md" style={{ marginBottom: '0.75rem', color: '#151515' }}>
                        Basic Information
                      </Title>
                      <DescriptionList isHorizontal isCompact>
                        <DescriptionListGroup>
                          <DescriptionListTerm style={{ minWidth: '150px' }}>VM Name</DescriptionListTerm>
                          <DescriptionListDescription>
                            {vmId}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm style={{ minWidth: '150px' }}>Template</DescriptionListTerm>
                          <DescriptionListDescription>
                            {selectedTemplate?.title || selectedTemplateId}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </div>

                    {/* Category sections in left column */}
                    {renderCategorySection('general', 'General Settings', categorizedForReview.general)}
                    {renderCategorySection('network', 'Network Configuration', categorizedForReview.network)}
                    {renderCategorySection('storage', 'Storage Configuration', categorizedForReview.storage)}

                    {/* Run Strategy Section */}
                    {templateSupportsParam(['run_strategy', 'vm_run_strategy']) && (
                    <div style={{ marginBottom: '0' }}>
                      <Title headingLevel="h4" size="md" style={{ marginBottom: '0.75rem', color: '#151515' }}>
                        Run Strategy
                      </Title>
                      <DescriptionList isHorizontal isCompact>
                        <DescriptionListGroup>
                          <DescriptionListTerm style={{ minWidth: '150px' }}>Strategy</DescriptionListTerm>
                          <DescriptionListDescription>
                            {vmRunStrategy}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </div>
                    )}
                  </div>

                  {(templateSupportsParam(['cpu_count', 'vm_cpu_cores', 'cpus']) ||
                    templateSupportsParam(['memory_gb', 'vm_memory_size', 'memory']) ||
                    templateSupportsParam(['disk_size_gb', 'vm_disk_size', 'disk_size'])) && (
                  <div style={{ flex: '0 0 200px' }}>
                    {/* Right column - Resource Specifications */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {templateSupportsParam(['cpu_count', 'vm_cpu_cores', 'cpus']) && (
                      <Card isCompact style={{ textAlign: 'center', padding: '0.65rem', backgroundColor: '#f5f5f5', width: '180px' }}>
                        <CardBody style={{ padding: '0.65rem' }}>
                          <div style={{ fontSize: '1.5rem', color: '#0066cc', marginBottom: '0.15rem' }}>
                            {vmCpuCores}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                            CPU Core
                          </div>
                        </CardBody>
                      </Card>
                      )}
                      {templateSupportsParam(['memory_gb', 'vm_memory_size', 'memory']) && (
                      <Card isCompact style={{ textAlign: 'center', padding: '0.65rem', backgroundColor: '#f5f5f5', width: '180px' }}>
                        <CardBody style={{ padding: '0.65rem' }}>
                          <div style={{ fontSize: '1.5rem', color: '#0066cc', marginBottom: '0.15rem' }}>
                            {vmMemoryGi} Gi
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                            Memory
                          </div>
                        </CardBody>
                      </Card>
                      )}
                      {templateSupportsParam(['disk_size_gb', 'vm_disk_size', 'disk_size']) && (
                      <Card isCompact style={{ textAlign: 'center', padding: '0.65rem', backgroundColor: '#f5f5f5', width: '180px' }}>
                        <CardBody style={{ padding: '0.65rem' }}>
                          <div style={{ fontSize: '1.5rem', color: '#0066cc', marginBottom: '0.15rem' }}>
                            {vmDiskGi} Gi
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                            Disk Size
                          </div>
                        </CardBody>
                      </Card>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {renderCategorySection('hardware', 'Hardware Resources', categorizedForReview.hardware)}
            {renderCategorySection('other', 'Additional Settings', categorizedForReview.other)}

            {cloudInitConfig && (
              <div style={{ marginBottom: '1.5rem' }}>
                <Title headingLevel="h4" size="md" style={{ marginBottom: '0.75rem', color: '#151515' }}>
                  Cloud-init Configuration
                </Title>
                <Card isCompact>
                  <CardBody>
                    <pre style={{
                      fontSize: '0.8rem',
                      maxHeight: '200px',
                      overflow: 'auto',
                      backgroundColor: '#f5f5f5',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      margin: 0,
                    }}>
                      {cloudInitConfig}
                    </pre>
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={handleClose}
      aria-label="Create virtual machine wizard"
    >
      <ModalHeader title="Create virtual machine" />
      <ModalBody>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
              Step {currentStepIndex + 1}: {currentStep?.name}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
              {Math.round(progressValue)}%
            </span>
          </div>
          <Progress
            value={progressValue}
            measureLocation={ProgressMeasureLocation.none}
            variant={currentStep?.id === 'review' ? ProgressVariant.success : undefined}
          />
        </div>
        <div style={{ minHeight: '500px', maxHeight: '500px', overflowY: 'auto', paddingRight: '1rem' }}>{renderStepContent()}</div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={currentStepIndex === steps.length - 1 ? handleCreate : handleNext}
          isDisabled={!canProceed() || isCreating}
          isLoading={isCreating}
        >
          {currentStepIndex === steps.length - 1 ? (isCreating ? 'Creating...' : 'Create') : 'Next'}
        </Button>
        {currentStepIndex > 0 && (
          <Button variant="secondary" onClick={handleBack} isDisabled={isCreating}>
            Back
          </Button>
        )}
        <Button variant="link" onClick={handleClose} isDisabled={isCreating}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
