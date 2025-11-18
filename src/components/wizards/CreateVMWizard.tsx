import { useState, useEffect } from 'react'
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
  Switch,
  FileUpload,
  Slider,
  Flex,
  FlexItem,
} from '@patternfly/react-core'
import { Template, TemplateParameter } from '../../api/types'
import { fetchAllOSImages, getImagePath, OSImage } from '../../utils/imageRegistry'
import { getGenericTemplateId } from '../../api/config'
import { getTemplates } from '../../api/templates'

interface CreateVMWizardProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (vmId: string, templateId: string, parameters: Record<string, any>) => Promise<void>
  templates: Template[]
  initialOS?: string
  initialVersion?: string
}

interface WizardStep {
  id: string
  name: string
  category?: string
}

// Machine size presets organized by tiers with very subtle color coding
const machineSizeTiers = {
  standard: {
    title: 'Standard Series',
    sizes: [
      { id: 'small', name: 'Small', cpu: 2, memory: 16, description: '2 vCPU / 16 Gi RAM', color: '#f8fbf8' },
      { id: 'medium', name: 'Medium', cpu: 4, memory: 32, description: '4 vCPU / 32 Gi RAM', color: '#f6faf7' },
      { id: 'large', name: 'Large', cpu: 8, memory: 64, description: '8 vCPU / 64 Gi RAM', color: '#f4f9f5' },
    ]
  },
  highPerformance: {
    title: 'High-Performance Series',
    sizes: [
      { id: 'xlarge', name: 'XLarge', cpu: 16, memory: 128, description: '16 vCPU / 128 Gi RAM', color: '#fcfaff' },
      { id: '2xlarge', name: '2XLarge', cpu: 32, memory: 256, description: '32 vCPU / 256 Gi RAM', color: '#fbf9ff' },
      { id: '4xlarge', name: '4XLarge', cpu: 48, memory: 384, description: '48 vCPU / 384 Gi RAM', color: '#faf8ff' },
      { id: '8xlarge', name: '8XLarge', cpu: 64, memory: 512, description: '64 vCPU / 512 Gi RAM', color: '#f8f6ff' },
    ]
  }
}

// Disk size slider - value-based configuration (using actual Gi values)
// Only labeled values are included for cleaner visual alignment
const diskSizeOptions = [
  { value: 50, label: '' },     // Minimum value
  { value: 100, label: '' },
  { value: 200, label: '200Gi' },
  { value: 500, label: '500Gi' },
  { value: 1024, label: '1Ti' },    // 1Ti = 1024 Gi
  { value: 2048, label: '2Ti' },    // 2Ti = 2048 Gi
  { value: 5120, label: '5Ti' },    // 5Ti = 5120 Gi
]

// Helper function to format disk size for display
const formatDiskSize = (sizeInGi: number): string => {
  if (sizeInGi >= 1024) {
    const ti = sizeInGi / 1024
    return ti % 1 === 0 ? `${ti} Ti` : `${ti.toFixed(1)} Ti`
  }
  return `${sizeInGi} Gi`
}

export const CreateVMWizard: React.FC<CreateVMWizardProps> = ({
  isOpen,
  onClose,
  onCreate,
  templates,
  initialOS,
  initialVersion,
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
  const [cloudInitFilename, setCloudInitFilename] = useState('')
  const [isCloudInitLoading, setIsCloudInitLoading] = useState(false)

  // Internal templates state - fetch when wizard opens
  const [internalTemplates, setInternalTemplates] = useState<Template[]>(templates)
  const [_loadingTemplates, setLoadingTemplates] = useState(false)

  // Hardware configuration fields (not in template)
  const [vmCpuCores, setVmCpuCores] = useState(2)
  const [vmMemoryGi, setVmMemoryGi] = useState(4)  // Store as numeric Gi
  const [vmDiskGi, setVmDiskGi] = useState(200)    // Store as numeric Gi, default 200 Gi
  const [vmRunStrategy, setVmRunStrategy] = useState('Always')

  // Dropdown states for enhanced UI
  const [runStrategyDropdownOpen, setRunStrategyDropdownOpen] = useState(false)
  const [memoryUnitDropdownOpen, setMemoryUnitDropdownOpen] = useState(false)
  const [diskUnitDropdownOpen, setDiskUnitDropdownOpen] = useState(false)
  const [networkTypeDropdownOpen, setNetworkTypeDropdownOpen] = useState(false)

  // Machine size presets
  const [advancedHardwareMode, setAdvancedHardwareMode] = useState(false)
  const [selectedSizePreset, setSelectedSizePreset] = useState('medium')

  // Image selection state
  const [availableOSImages, setAvailableOSImages] = useState<OSImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [imageSelectionMode, setImageSelectionMode] = useState<'preset' | 'custom'>('preset')
  const [selectedOS, setSelectedOS] = useState<string>('')
  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [customImagePath, setCustomImagePath] = useState<string>('')
  const [osDropdownOpen, setOsDropdownOpen] = useState(false)
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false)

  // Generic template configuration
  const [genericTemplateId, setGenericTemplateId] = useState<string>('')

  const selectedTemplate = internalTemplates.find(t => t.id === selectedTemplateId)

  // Filter out the generic template from user-visible templates
  const userTemplates = internalTemplates.filter(t => t.id !== genericTemplateId)

  // Fetch generic template ID when wizard opens
  useEffect(() => {
    if (isOpen && !genericTemplateId) {
      getGenericTemplateId()
        .then((id) => {
          setGenericTemplateId(id)
        })
        .catch((error) => {
          console.error('Failed to fetch generic template ID:', error)
        })
    }
  }, [isOpen, genericTemplateId])

  // Fetch templates when wizard opens - don't rely on props
  useEffect(() => {
    if (isOpen) {
      // Always fetch templates when wizard opens to ensure we have the latest
      setLoadingTemplates(true)
      getTemplates()
        .then((response) => {
          setInternalTemplates(response.items || [])
        })
        .catch((error) => {
          console.error('Failed to fetch templates:', error)
          // Fallback to props if fetch fails
          setInternalTemplates(templates)
        })
        .finally(() => {
          setLoadingTemplates(false)
        })
    }
  }, [isOpen, templates])

  // Fetch available OS images when wizard opens
  useEffect(() => {
    if (isOpen && availableOSImages.length === 0) {
      setLoadingImages(true)
      fetchAllOSImages()
        .then((images) => {
          // Filter out "coming soon" / unavailable images
          const availableImages = images.filter(img => img.available !== false)
          setAvailableOSImages(availableImages)
          // Set initial OS and version if provided (from catalog)
          if (initialOS && initialVersion) {
            setSelectedOS(initialOS)
            setSelectedVersion(initialVersion)
          }
        })
        .catch((error) => {
          console.error('Failed to fetch OS images:', error)
        })
        .finally(() => {
          setLoadingImages(false)
        })
    }
  }, [isOpen, availableOSImages.length, initialOS, initialVersion])

  // Sync preset selection with hardware values when not in advanced mode
  useEffect(() => {
    if (!advancedHardwareMode && selectedSizePreset) {
      // Find preset in either tier
      let preset = machineSizeTiers.standard.sizes.find(p => p.id === selectedSizePreset)
      if (!preset) {
        preset = machineSizeTiers.highPerformance.sizes.find(p => p.id === selectedSizePreset)
      }
      if (preset) {
        setVmCpuCores(preset.cpu)
        setVmMemoryGi(preset.memory)
      }
    }
  }, [advancedHardwareMode, selectedSizePreset])

  // Get currently selected OS image
  const selectedOSImage = availableOSImages.find(os => os.os === selectedOS)

  // Get full image path for current selection
  const currentImagePath = imageSelectionMode === 'custom'
    ? customImagePath
    : selectedOSImage && selectedVersion
      ? getImagePath(selectedOSImage.repository, selectedVersion)
      : ''

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
               name.includes('ssh') || name.includes('run') && name.includes('strategy') ||
               title.includes('name') || title.includes('ssh') || title.includes('run') && title.includes('strategy')) {
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

    // Add VM Configuration step (name + image selection) - always required
    steps.push({ id: 'vm-config', name: 'VM Configuration' })

    // Only add customization steps if user wants to customize the template
    if (customizeTemplate) {
      const categorized = categorizeParameters(selectedTemplate.parameters || [])

      // Only show Hardware Configuration step if template has hardware parameters
      const hasHardwareParams = selectedTemplate.parameters?.some(p =>
        ['cpu_count', 'vm_cpu_cores', 'cpus', 'memory_gb', 'vm_memory_size', 'memory',
         'disk_size_gb', 'vm_disk_size', 'disk_size'].includes(p.name)
      )
      if (hasHardwareParams) {
        steps.push({ id: 'hardware-config', name: 'Hardware Configuration' })
      }

      if (categorized.general.length > 0) {
        steps.push({ id: 'general', name: 'General', category: 'general' })
      }
      // Skip "Additional Hardware" step - already covered in hardware-config
      if (categorized.network.length > 0) {
        steps.push({ id: 'network', name: 'Network', category: 'network' })
      }
      if (categorized.storage.length > 0) {
        steps.push({ id: 'storage', name: 'Storage', category: 'storage' })
      }
      if (categorized.cloudInit.length > 0) {
        steps.push({ id: 'cloudinit', name: 'Cloud-init', category: 'cloudInit' })
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
      setVmDiskGi(200)
      setVmRunStrategy('Always')
      setAdvancedHardwareMode(false)
      setSelectedSizePreset('medium')
      // Reset image selection
      setImageSelectionMode('preset')
      setCustomImagePath('')
      setSelectedOS('')
      setSelectedVersion('')
      // Reset cloud-init file upload
      setCloudInitFilename('')
      setIsCloudInitLoading(false)
      onClose()
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setTemplateDropdownOpen(false)

    const template = internalTemplates.find(t => t.id === templateId)
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

  // Helper to wrap value in protobuf Any format
  const wrapInProtobufAny = (value: any, type: string) => {
    return {
      '@type': type,
      value: value
    }
  }

  // Helper to get parameter type from template
  const getParameterType = (paramName: string): string | undefined => {
    const param = selectedTemplate?.parameters?.find(p => p.name === paramName)
    return param?.type
  }

  const handleCreate = async () => {
    try {
      setIsCreating(true)
      setCreationError(null)

      // Generate a unique VM ID if not provided
      const generatedVmId = vmId || `vm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

      // Determine which template to use
      // If creating manually, use the generic template; otherwise use selected template
      const templateToUse = useTemplate ? selectedTemplateId : genericTemplateId

      // Build parameter overrides - only include values that differ from defaults
      // The fulfillment service will merge these with template defaults
      // Each parameter must be wrapped in google.protobuf.Any format
      const vmParameters: Record<string, any> = {}

      // Always include image source (required parameter)
      if (currentImagePath && templateSupportsParam(['vm_image_source', 'image_source'])) {
        const paramType = getParameterType('vm_image_source') || 'type.googleapis.com/google.protobuf.StringValue'
        vmParameters.vm_image_source = wrapInProtobufAny(currentImagePath, paramType)
      }

      // Automatically set OS type based on selected image
      if (templateSupportsParam(['vm_os_type'])) {
        const osType = imageSelectionMode === 'custom' ? 'linux' : (selectedOSImage?.osType || 'linux')
        const paramType = getParameterType('vm_os_type') || 'type.googleapis.com/google.protobuf.StringValue'
        vmParameters.vm_os_type = wrapInProtobufAny(osType, paramType)
      }

      // Only include customized parameters if user chose to customize
      if (customizeTemplate) {
        // Map UI state to template parameter names and add only if customized

        // Hardware configuration
        if (templateSupportsParam(['vm_cpu_cores', 'cpu_count', 'cpus'])) {
          const defaultCpu = 2
          if (vmCpuCores !== defaultCpu) {
            const paramType = getParameterType('vm_cpu_cores') || 'type.googleapis.com/google.protobuf.Int64Value'
            vmParameters.vm_cpu_cores = wrapInProtobufAny(String(vmCpuCores), paramType)
          }
        }

        if (templateSupportsParam(['vm_memory_size', 'memory_gb', 'memory', 'vm_memory'])) {
          const defaultMemory = 4
          if (vmMemoryGi !== defaultMemory) {
            const paramType = getParameterType('vm_memory_size') || 'type.googleapis.com/google.protobuf.StringValue'
            vmParameters.vm_memory_size = wrapInProtobufAny(`${vmMemoryGi}Gi`, paramType)
          }
        }

        if (templateSupportsParam(['vm_disk_size', 'disk_size_gb', 'disk_size'])) {
          const defaultDisk = 200
          if (vmDiskGi !== defaultDisk) {
            const paramType = getParameterType('vm_disk_size') || 'type.googleapis.com/google.protobuf.StringValue'
            vmParameters.vm_disk_size = wrapInProtobufAny(`${vmDiskGi}Gi`, paramType)
          }
        }

        if (templateSupportsParam(['vm_run_strategy', 'run_strategy'])) {
          const defaultRunStrategy = 'Always'
          if (vmRunStrategy !== defaultRunStrategy) {
            const paramType = getParameterType('vm_run_strategy') || 'type.googleapis.com/google.protobuf.StringValue'
            vmParameters.vm_run_strategy = wrapInProtobufAny(vmRunStrategy, paramType)
          }
        }

        // Cloud-init configuration
        if (cloudInitConfig && cloudInitConfig.trim() !== '') {
          const paramType = getParameterType('cloud_init_config') || 'type.googleapis.com/google.protobuf.Value'
          vmParameters.cloud_init_config = wrapInProtobufAny(cloudInitConfig, paramType)
        }

        // Additional user-configured parameters from templateParameters
        if (selectedTemplate?.parameters) {
          selectedTemplate.parameters.forEach(param => {
            // Skip parameters we've already handled
            if (['vm_name', 'vm_cpu_cores', 'vm_memory_size', 'vm_disk_size', 'vm_run_strategy', 'cloud_init_config', 'vm_image_source', 'image_source', 'vm_os_type'].includes(param.name)) {
              return
            }

            // Include parameter if user provided a value
            let userValue = templateParameters[param.name]
            if (userValue !== undefined && userValue !== null && userValue !== '') {
              // Convert Int64Value to string for protobuf JSON encoding
              if (param.type === 'type.googleapis.com/google.protobuf.Int64Value' && typeof userValue === 'number') {
                userValue = String(userValue)
              }
              // Convert BoolValue to boolean for protobuf JSON encoding
              if (param.type === 'type.googleapis.com/google.protobuf.BoolValue' && typeof userValue === 'string') {
                userValue = userValue === 'true'
              }
              // Wrap in protobuf Any format
              const paramType = param.type || 'type.googleapis.com/google.protobuf.StringValue'
              vmParameters[param.name] = wrapInProtobufAny(userValue, paramType)
            }
          })
        }
      }

      // Create VM with parameter overrides
      // The fulfillment service will merge these with template defaults
      await onCreate(generatedVmId, templateToUse, vmParameters)

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
      case 'vm-config':
        // Require VM name to be provided and non-empty
        const hasValidName = !!vmId && vmId.trim().length > 0
        // Require image selection (either from catalog, custom, or template with image)
        let hasValidImage = false
        if (selectedTemplateId && selectedTemplateId !== genericTemplateId) {
          // Template selected (not generic) - check if it has an image source parameter
          const template = internalTemplates.find(t => t.id === selectedTemplateId)
          const imageParam = template?.parameters?.find(p => p.name === 'vm_image_source')
          hasValidImage = !!imageParam?.default?.value || (!!selectedOS && !!selectedVersion)
        } else if (imageSelectionMode === 'custom') {
          hasValidImage = !!customImagePath && customImagePath.trim().length > 0
        } else {
          hasValidImage = !!selectedOS && !!selectedVersion
        }
        return hasValidName && hasValidImage
      case 'template':
        return !!selectedTemplateId
      case 'hardware':
      case 'general':
      case 'network':
      case 'storage':
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

  const renderParameterFields = (params: TemplateParameter[]) => {
    // Filter out parameters already handled in hardware-config and vm-config steps
    const filteredParams = params.filter(param => {
      const name = param.name.toLowerCase()
      const title = (param.title || '').toLowerCase()
      console.log('Processing parameter:', param.name, 'title:', param.title)

      // Skip hardware parameters handled in hardware-config step
      if (['vm_cpu_cores', 'cpu_count', 'cpus', 'vm_memory_size', 'memory_gb', 'memory',
           'vm_disk_size', 'disk_size_gb', 'disk_size'].includes(param.name)) {
        return false
      }
      // Skip image source parameter handled in vm-config step
      if (['vm_image_source', 'image_source'].includes(param.name)) {
        return false
      }
      // Skip OS type - automatically filled based on selected image
      if (param.name === 'vm_os_type') {
        return false
      }
      // Skip hidden parameters (namespace, service exposure, storage class, service type/ports)
      // Check parameter name (lowercase) and title (lowercase) for matches
      const shouldHide =
        // Namespace
        (name.includes('namespace')) ||
        // Service exposure - check both name and title
        (name.includes('expose') && name.includes('service')) ||
        (title.includes('expose') && title.includes('service')) ||
        name === 'exposeAsService'.toLowerCase() ||
        name === 'ExposeAsService'.toLowerCase() ||
        // Storage class
        (name.includes('storage') && name.includes('class')) ||
        // Service type
        (name.includes('service') && name.includes('type')) ||
        // Service ports
        (name.includes('service') && name.includes('port')) ||
        name === 'ports'

      if (shouldHide) {
        console.log('Hiding parameter:', param.name, 'title:', param.title)
        return false
      }
      return true
    })

    return (
      <>
        {filteredParams.map((param) => {
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
  }

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
                  isSelected={useTemplate && selectedTemplateId !== genericTemplateId}
                  onClick={() => {
                    setUseTemplate(true)
                    setSelectedTemplateId('')
                    setCustomizeTemplate(false)
                  }}
                  style={{ cursor: 'pointer', height: '100%' }}
                >
                  <CardBody>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Radio
                        id="use-template"
                        name="creation-method"
                        isChecked={useTemplate && selectedTemplateId !== genericTemplateId}
                        onChange={() => {
                          setUseTemplate(true)
                          setSelectedTemplateId('')
                          setCustomizeTemplate(false)
                        }}
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
                  isSelectable={!!genericTemplateId}
                  isSelected={selectedTemplateId === genericTemplateId && !!genericTemplateId}
                  onClick={() => {
                    if (genericTemplateId) {
                      setUseTemplate(true)
                      setSelectedTemplateId(genericTemplateId)
                      setCustomizeTemplate(true)
                    }
                  }}
                  style={{
                    cursor: genericTemplateId ? 'pointer' : 'not-allowed',
                    height: '100%',
                    opacity: genericTemplateId ? 1 : 0.6
                  }}
                >
                  <CardBody>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Radio
                        id="create-manual"
                        name="creation-method"
                        isChecked={selectedTemplateId === genericTemplateId && !!genericTemplateId}
                        isDisabled={!genericTemplateId}
                        onChange={() => {
                          if (genericTemplateId) {
                            setUseTemplate(true)
                            setSelectedTemplateId(genericTemplateId)
                            setCustomizeTemplate(true)
                          }
                        }}
                      />
                      <Title headingLevel="h3" size="lg" style={{ margin: 0 }}>
                        Create manually
                      </Title>
                      {!genericTemplateId && (
                        <Spinner size="md" style={{ marginLeft: '0.5rem' }} />
                      )}
                    </div>
                    <p style={{ color: '#6a6e73', marginLeft: '2rem' }}>
                      Configure all settings manually for advanced customization. For advanced users.
                    </p>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>

            {/* Show template selection only if "Use a template" is selected (not "Create manually") */}
            {useTemplate && selectedTemplateId !== genericTemplateId && (
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
                          ? userTemplates.find(t => t.id === selectedTemplateId)?.title || selectedTemplateId
                          : 'Select a template'}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {userTemplates.map((template) => (
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

      case 'vm-config':
        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.5rem' }}>
              Configure your virtual machine
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: 0, fontSize: '0.95rem', marginTop: 0 }}>
              Provide a name for your VM and select the operating system image.
            </p>

            {/* VM Name */}
            <FormGroup
              label="Virtual Machine Name"
              isRequired
              fieldId="vm-name"
            >
              <TextInput
                isRequired
                type="text"
                id="vm-name"
                name="vm-name"
                value={vmId}
                onChange={(_event, value) => setVmId(value)}
                placeholder="Enter VM name (e.g., 'web-server-prod', 'database-test')"
                validated={vmId && vmId.trim().length > 0 ? 'success' : 'default'}
              />
              {!vmId || vmId.trim().length === 0 ? (
                <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                  VM name is required and must follow Kubernetes naming conventions (lowercase alphanumeric, hyphens allowed)
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: '#3e8635', marginTop: '0.5rem' }}>
                  ✓ Valid VM name
                </div>
              )}
            </FormGroup>

            {/* Image Source */}
            <FormGroup
              label="Image Source"
              isRequired
              fieldId="image-source"
              style={{ marginTop: '1rem' }}
            >
              {/* Only show the switch if creating manually (using generic template) and not from catalog */}
              {!initialOS && !initialVersion && selectedTemplateId === genericTemplateId && (
                <div style={{ marginBottom: '1rem' }}>
                  <Switch
                    id="image-mode-switch"
                    label={imageSelectionMode === 'custom' ? 'Custom image path' : 'Select from catalog'}
                    isChecked={imageSelectionMode === 'custom'}
                    onChange={(_event, checked) => {
                      setImageSelectionMode(checked ? 'custom' : 'preset')
                    }}
                  />
                </div>
              )}

              {loadingImages ? (
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                  <Spinner size="md" />
                  <div style={{ marginTop: '0.5rem', color: '#6a6e73' }}>Loading available images...</div>
                </div>
              ) : ((initialOS && initialVersion) || (selectedTemplateId && selectedTemplateId !== genericTemplateId)) ? (
                /* Read-only display when coming from catalog or using a template */
                (() => {
                  // Get image source value from template or catalog
                  let imageValue = currentImagePath
                  if (selectedTemplateId && selectedTemplateId !== genericTemplateId) {
                    // Find vm_image_source parameter from selected template
                    const template = internalTemplates.find(t => t.id === selectedTemplateId)
                    const imageParam = template?.parameters?.find(p => p.name === 'vm_image_source')
                    if (imageParam?.default) {
                      imageValue = imageParam.default.value || ''
                    }
                  }

                  return (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#f5f5f5',
                      border: '1px solid #d2d2d2',
                      borderRadius: '4px'
                    }}>
                      {selectedOSImage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img
                            src={selectedOSImage.icon}
                            alt={selectedOSImage.displayName}
                            style={{ width: '32px', height: '32px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#151515' }}>
                              {selectedOSImage.displayName} {selectedVersion}
                            </div>
                            <code style={{ fontSize: '0.85rem', color: '#6a6e73' }}>
                              {imageValue}
                            </code>
                          </div>
                        </div>
                      ) : imageValue ? (
                        <code style={{ fontSize: '0.95rem', color: '#151515' }}>
                          {imageValue}
                        </code>
                      ) : (
                        <div style={{ fontSize: '0.9rem', color: '#6a6e73', fontStyle: 'italic' }}>
                          No image source defined in template
                        </div>
                      )}
                    </div>
                  )
                })()
              ) : imageSelectionMode === 'custom' ? (
                <TextInput
                  type="text"
                  id="custom-image-path"
                  value={customImagePath}
                  onChange={(_event, value) => {
                    setCustomImagePath(value)
                  }}
                  placeholder="quay.io/containerdisks/fedora:41"
                />
              ) : (
                <>
                  <Grid hasGutter>
                    <GridItem span={6}>
                      <FormGroup label="Operating System" fieldId="os-select">
                        <Dropdown
                          isOpen={osDropdownOpen}
                          onSelect={(_, value) => {
                            const newOS = value as string
                            setSelectedOS(newOS)
                            const newOSImage = availableOSImages.find(os => os.os === newOS)
                            if (newOSImage && newOSImage.versions.length > 0) {
                              setSelectedVersion(newOSImage.versions[0])
                            }
                            setOsDropdownOpen(false)
                          }}
                          onOpenChange={(isOpen) => setOsDropdownOpen(isOpen)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              onClick={() => setOsDropdownOpen(!osDropdownOpen)}
                              isExpanded={osDropdownOpen}
                              style={{ width: '100%' }}
                            >
                              {selectedOSImage ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <img src={selectedOSImage.icon} alt={selectedOSImage.displayName} style={{ width: '20px', height: '20px' }} />
                                  {selectedOSImage.displayName}
                                </div>
                              ) : 'Select OS'}
                            </MenuToggle>
                          )}
                        >
                          <DropdownList>
                            {availableOSImages.map((osImage) => (
                              <DropdownItem key={osImage.os} value={osImage.os}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <img src={osImage.icon} alt={osImage.displayName} style={{ width: '20px', height: '20px' }} />
                                  {osImage.displayName}
                                </div>
                              </DropdownItem>
                            ))}
                          </DropdownList>
                        </Dropdown>
                      </FormGroup>
                    </GridItem>
                    <GridItem span={6}>
                      <FormGroup label="Version" fieldId="version-select">
                        <Dropdown
                          isOpen={versionDropdownOpen}
                          onSelect={(_, value) => {
                            setSelectedVersion(value as string)
                            setVersionDropdownOpen(false)
                          }}
                          onOpenChange={(isOpen) => setVersionDropdownOpen(isOpen)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                              isExpanded={versionDropdownOpen}
                              style={{ width: '100%' }}
                              isDisabled={!selectedOSImage || selectedOSImage.versions.length === 0}
                            >
                              {selectedVersion || 'Select version'}
                            </MenuToggle>
                          )}
                        >
                          <DropdownList>
                            {selectedOSImage?.versions.map((version) => (
                              <DropdownItem key={version} value={version}>
                                {version}
                              </DropdownItem>
                            ))}
                          </DropdownList>
                        </Dropdown>
                      </FormGroup>
                    </GridItem>
                  </Grid>
                  {currentImagePath && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginBottom: '0.25rem' }}>
                        Image path:
                      </div>
                      <code style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                        {currentImagePath}
                      </code>
                    </div>
                  )}
                </>
              )}
              <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                {(initialOS && initialVersion)
                  ? 'Image pre-selected from catalog'
                  : (selectedTemplateId && selectedTemplateId !== genericTemplateId)
                    ? 'Image defined by selected template'
                    : 'Container disk image for the VM'}
              </div>
            </FormGroup>
          </Form>
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
                      ? internalTemplates.find(t => t.id === selectedTemplateId)?.title || selectedTemplateId
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

      case 'hardware-config':
        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              Hardware Configuration
            </Title>

            <Form>
              {/* Machine Size - Tiered Selection */}
              <FormGroup fieldId="machine-size" style={{ marginBottom: '0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ minWidth: '180px', paddingTop: '0.5rem' }}>
                    <Title headingLevel="h3" size="lg" style={{ marginBottom: '0.5rem' }}>
                      Machine Size
                    </Title>
                    <Title headingLevel="h4" size="md" style={{ color: '#6a6e73', fontWeight: 400 }}>
                      Standard Series
                    </Title>
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {machineSizeTiers.standard.sizes.map((size) => (
                      <Card
                        key={size.id}
                        isSelectable
                        isSelected={selectedSizePreset === size.id}
                        onClick={() => setSelectedSizePreset(size.id)}
                        style={{
                          cursor: 'pointer',
                          border: selectedSizePreset === size.id ? '3px solid #0066cc' : '1px solid #d2d2d2',
                          backgroundColor: selectedSizePreset === size.id ? '#e7f1fa' : size.color,
                          transition: 'all 0.2s ease',
                          width: '200px',
                          height: '120px',
                          flex: '0 0 200px'
                        }}
                      >
                        <CardBody>
                          <Title headingLevel="h5" size="lg" style={{
                            marginBottom: '0.5rem',
                            color: selectedSizePreset === size.id ? '#0066cc' : '#151515',
                            fontWeight: selectedSizePreset === size.id ? 700 : 600
                          }}>
                            {size.name}
                          </Title>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6a6e73'
                          }}>
                            {size.description}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* High-Performance Series */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ minWidth: '180px', paddingTop: '0.5rem' }}>
                    <Title headingLevel="h4" size="md" style={{ color: '#6a6e73', fontWeight: 400, lineHeight: '1.3' }}>
                      High-Performance<br />Series
                    </Title>
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {machineSizeTiers.highPerformance.sizes.map((size) => (
                      <Card
                        key={size.id}
                        isSelectable
                        isSelected={selectedSizePreset === size.id}
                        onClick={() => setSelectedSizePreset(size.id)}
                        style={{
                          cursor: 'pointer',
                          border: selectedSizePreset === size.id ? '3px solid #0066cc' : '1px solid #d2d2d2',
                          backgroundColor: selectedSizePreset === size.id ? '#e7f1fa' : size.color,
                          transition: 'all 0.2s ease',
                          width: '200px',
                          height: '120px',
                          flex: '0 0 200px'
                        }}
                      >
                        <CardBody>
                          <Title headingLevel="h5" size="lg" style={{
                            marginBottom: '0.5rem',
                            color: selectedSizePreset === size.id ? '#0066cc' : '#151515',
                            fontWeight: selectedSizePreset === size.id ? 700 : 600
                          }}>
                            {size.name}
                          </Title>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6a6e73'
                          }}>
                            {size.description}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              </FormGroup>

              {/* Disk Size Slider */}
              {templateSupportsParam(['disk_size_gb', 'vm_disk_size', 'disk_size']) && (
                <FormGroup
                  label={`Disk Size: ${formatDiskSize(vmDiskGi)}`}
                  isRequired
                  fieldId="disk-size"
                  style={{ marginBottom: '2rem' }}
                >
                  <div style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
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
                </FormGroup>
              )}
            </Form>
          </div>
        )
      case 'cloudinit':
        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.25rem' }}>
              Cloud-init Configuration
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '0.75rem' }}>
              Upload a cloud-init YAML file or paste the configuration directly. Used for VM initialization with user data, network config, etc.
            </p>

            <FormGroup label="Upload cloud-init file" fieldId="cloud-init-upload">
              <FileUpload
                id="cloud-init-file"
                value={cloudInitConfig}
                filename={cloudInitFilename}
                onFileInputChange={(_event: any, file: File) => {
                  setCloudInitFilename(file.name)
                }}
                onDataChange={(_event: any, value: string) => setCloudInitConfig(value)}
                onTextChange={(_event: any, value: string) => setCloudInitConfig(value)}
                onClearClick={() => {
                  setCloudInitConfig('')
                  setCloudInitFilename('')
                }}
                isLoading={isCloudInitLoading}
                allowEditingUploadedText
                browseButtonText="Upload"
                clearButtonText="Clear"
                type="text"
                dropzoneProps={{
                  accept: {
                    'text/yaml': ['.yaml', '.yml'],
                    'text/plain': ['.txt'],
                  }
                }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Upload a YAML file or paste cloud-init configuration. Example: #cloud-config format
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            {cloudInitConfig && (
              <FormGroup label="Configuration preview" fieldId="cloud-init-preview" style={{ marginTop: '1.5rem' }}>
                <div style={{
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #d2d2d2',
                  borderRadius: '4px',
                  padding: '1rem',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <pre style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {cloudInitConfig}
                  </pre>
                </div>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      YAML preview of your cloud-init configuration
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            )}
          </Form>
        )

      case 'general':
      case 'hardware':
      case 'network':
      case 'storage':
        if (!selectedTemplate?.parameters) return null
        const categorized = categorizeParameters(selectedTemplate.parameters)
        const categoryParams = categorized[currentStep.category!] || []

        if (categoryParams.length === 0) return null

        // Add helpful descriptions for each category
        const categoryDescriptions: Record<string, string> = {
          general: 'Configure basic settings for your virtual machine including SSH keys and other options.',
          hardware: 'Define the hardware resources allocated to your VM including CPU, memory, and disk space.',
          network: 'Configure network settings including interfaces, IP addresses, and network types.',
          storage: 'Set up storage configuration including disk images, sizes, and storage classes.',
        }

        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.25rem' }}>
              {currentStep.name} Configuration
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {categoryDescriptions[currentStep.category!] || 'Configure settings for your virtual machine.'}
            </p>
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
          // Filter out hardware parameters that are shown in the resource boxes
          const hardwareParamsInBoxes = ['vm_cpu_cores', 'cpu_count', 'cpus', 'vm_memory_size', 'memory_gb', 'memory', 'vm_disk_size', 'disk_size_gb', 'disk_size']

          const categoryValues = params
            .filter(p => !hardwareParamsInBoxes.includes(p.name))  // Skip hardware params shown in boxes
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
                        <DescriptionListGroup>
                          <DescriptionListTerm style={{ minWidth: '150px' }}>Image</DescriptionListTerm>
                          <DescriptionListDescription>
                            {imageSelectionMode === 'custom' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <code style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{customImagePath}</code>
                              </div>
                            ) : selectedOSImage ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <img src={selectedOSImage.icon} alt={selectedOSImage.displayName} style={{ width: '20px', height: '20px' }} />
                                <span>{selectedOSImage.displayName} {selectedVersion}</span>
                                <code style={{ fontSize: '0.85rem', color: '#6a6e73', marginLeft: '0.25rem' }}>({currentImagePath})</code>
                              </div>
                            ) : (
                              <span style={{ color: '#6a6e73', fontStyle: 'italic' }}>(not set)</span>
                            )}
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
      width="1140px"
    >
      <ModalHeader title="Create virtual machine" />
      <ModalBody>
        <div style={{ marginBottom: '1.5rem' }}>
          <Flex alignItems={{ default: 'alignItemsCenter' }} justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                Step {currentStepIndex + 1}: {currentStep?.name}
              </span>
            </FlexItem>
            <FlexItem grow={{ default: 'grow' }} style={{ padding: '0 1rem' }}>
              <Progress
                value={progressValue}
                measureLocation={ProgressMeasureLocation.none}
                variant={currentStep?.id === 'review' ? ProgressVariant.success : undefined}
              />
            </FlexItem>
            <FlexItem>
              <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                {Math.round(progressValue)}%
              </span>
            </FlexItem>
          </Flex>
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
        {currentStep?.id === 'hardware-config' && (
          <div style={{
            marginLeft: 'auto',
            display: 'none',
            // display: 'flex', TODO add this in later versions
            alignItems: 'center',
            backgroundColor: '#0066cc',
            color: '#ffffff',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}>
            Estimated Monthly Cost: $XXX.XX
          </div>
        )}
      </ModalFooter>
    </Modal>
  )
}
