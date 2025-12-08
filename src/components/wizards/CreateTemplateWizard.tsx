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
  TextArea,
  Title,
  Card,
  CardBody,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
  Alert,
  AlertVariant,
  Spinner,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Checkbox,
  Radio,
} from '@patternfly/react-core'
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ActionsColumn,
} from '@patternfly/react-table'
import { TemplateParameter } from '../../api/types'
import { logger } from '@/utils/logger'

interface CreateTemplateWizardProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (templateId: string, title: string, description: string, parameters: TemplateParameter[]) => Promise<void>
}

interface WizardStep {
  id: string
  name: string
}

const PROTOBUF_TYPES = [
  'type.googleapis.com/google.protobuf.StringValue',
  'type.googleapis.com/google.protobuf.Int64Value',
  'type.googleapis.com/google.protobuf.BoolValue',
  'type.googleapis.com/google.protobuf.DoubleValue',
  'type.googleapis.com/google.protobuf.Value',
]

// Known/common VM parameters
const KNOWN_PARAMETERS: TemplateParameter[] = [
  {
    name: 'vm_cpu_cores',
    title: 'CPU Cores',
    description: 'Number of virtual CPU cores allocated to the VM',
    type: 'type.googleapis.com/google.protobuf.Int64Value',
    required: false,
    default: {
      '@type': 'type.googleapis.com/google.protobuf.Int64Value',
      value: 2,
    },
  },
  {
    name: 'vm_memory_size',
    title: 'Memory Size',
    description: 'Amount of RAM allocated to the VM (e.g., 4Gi, 8Gi)',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: false,
    default: {
      '@type': 'type.googleapis.com/google.protobuf.StringValue',
      value: '4Gi',
    },
  },
  {
    name: 'vm_disk_size',
    title: 'Disk Size',
    description: 'Size of the root disk (e.g., 50Gi, 100Gi)',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: false,
    default: {
      '@type': 'type.googleapis.com/google.protobuf.StringValue',
      value: '50Gi',
    },
  },
  {
    name: 'vm_run_strategy',
    title: 'Run Strategy',
    description: 'How the VM should be started and maintained (Always, Manual, RerunOnFailure, Halted)',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: false,
    default: {
      '@type': 'type.googleapis.com/google.protobuf.StringValue',
      value: 'Always',
    },
  },
  {
    name: 'vm_image_source',
    title: 'Image Source',
    description: 'Container disk image for the VM',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: true,
  },
  {
    name: 'vm_os_type',
    title: 'Operating System Type',
    description: 'Operating system type (linux, windows, etc.)',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: false,
    default: {
      '@type': 'type.googleapis.com/google.protobuf.StringValue',
      value: 'linux',
    },
  },
  {
    name: 'vm_network_type',
    title: 'Network Type',
    description: 'Network attachment type (pod, bridge, masquerade)',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: false,
    default: {
      '@type': 'type.googleapis.com/google.protobuf.StringValue',
      value: 'pod',
    },
  },
  {
    name: 'ssh_public_key',
    title: 'SSH Public Key',
    description: 'SSH public key for VM access',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: false,
  },
  {
    name: 'cloud_init_config',
    title: 'Cloud-init Configuration',
    description: 'YAML cloud-init configuration for VM initialization',
    type: 'type.googleapis.com/google.protobuf.Value',
    required: false,
  },
]

export const CreateTemplateWizard: React.FC<CreateTemplateWizardProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)

  // Basic info fields
  const [templateId, setTemplateId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Parameters
  const [parameters, setParameters] = useState<TemplateParameter[]>([])
  const [isAddingParameter, setIsAddingParameter] = useState(false)
  const [editingParameterIndex, setEditingParameterIndex] = useState<number | null>(null)

  // Parameter selection mode
  const [parameterMode, setParameterMode] = useState<'known' | 'custom'>('known')
  const [selectedKnownParam, setSelectedKnownParam] = useState<string>('')
  const [knownParamDropdownOpen, setKnownParamDropdownOpen] = useState(false)

  // Parameter form fields
  const [paramName, setParamName] = useState('')
  const [paramTitle, setParamTitle] = useState('')
  const [paramDescription, setParamDescription] = useState('')
  const [paramType, setParamType] = useState('type.googleapis.com/google.protobuf.StringValue')
  const [paramRequired, setParamRequired] = useState(false)
  const [paramDefaultValue, setParamDefaultValue] = useState('')
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)

  const steps: WizardStep[] = [
    { id: 'basic-info', name: 'Basic Information' },
    { id: 'parameters', name: 'Parameters' },
    { id: 'review', name: 'Review' },
  ]

  const currentStep = steps[currentStepIndex]
  const progressValue = ((currentStepIndex + 1) / steps.length) * 100

  const handleClose = () => {
    if (!isCreating) {
      // Reset all state
      setCurrentStepIndex(0)
      setTemplateId('')
      setTitle('')
      setDescription('')
      setParameters([])
      setIsAddingParameter(false)
      setEditingParameterIndex(null)
      setCreationError(null)
      resetParameterForm()
      onClose()
    }
  }

  const resetParameterForm = () => {
    setParameterMode('known')
    setSelectedKnownParam('')
    setParamName('')
    setParamTitle('')
    setParamDescription('')
    setParamType('type.googleapis.com/google.protobuf.StringValue')
    setParamRequired(false)
    setParamDefaultValue('')
  }

  const handleSelectKnownParameter = (paramName: string) => {
    const knownParam = KNOWN_PARAMETERS.find(p => p.name === paramName)
    if (knownParam) {
      setSelectedKnownParam(paramName)
      setParamName(knownParam.name)
      setParamTitle(knownParam.title || '')
      setParamDescription(knownParam.description || '')
      setParamType(knownParam.type || 'type.googleapis.com/google.protobuf.StringValue')
      setParamRequired(knownParam.required || false)
      setParamDefaultValue(String(knownParam.default?.value || ''))
    }
    setKnownParamDropdownOpen(false)
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      logger.debug('Template wizard: proceeding to next step', {
        from: currentStep.name,
        to: steps[currentStepIndex + 1].name
      })
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      logger.debug('Template wizard: going back to previous step', {
        from: currentStep.name,
        to: steps[currentStepIndex - 1].name
      })
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleCreate = async () => {
    try {
      setIsCreating(true)
      setCreationError(null)

      logger.info('Creating template', { templateId, title, paramCount: parameters.length })

      await onCreate(templateId, title, description, parameters)

      logger.info('Template created successfully', { templateId, title })

      handleClose()
    } catch (error) {
      logger.error('Failed to create template', error, { templateId, title })
      setCreationError(error instanceof Error ? error.message : 'Failed to create template')
    } finally {
      setIsCreating(false)
    }
  }

  const canProceed = () => {
    switch (currentStep?.id) {
      case 'basic-info':
        return !!templateId && templateId.trim().length > 0 && !!title && title.trim().length > 0
      case 'parameters':
        // Parameters are optional, always allow proceed
        return true
      case 'review':
        return true
      default:
        return true
    }
  }

  const handleAddParameter = () => {
    setIsAddingParameter(true)
    resetParameterForm()
  }

  const handleEditParameter = (index: number) => {
    const param = parameters[index]
    setEditingParameterIndex(index)
    setParameterMode('custom') // Always use custom mode for editing
    setParamName(param.name)
    setParamTitle(param.title || '')
    setParamDescription(param.description || '')
    setParamType(param.type || 'type.googleapis.com/google.protobuf.StringValue')
    setParamRequired(param.required || false)
    setParamDefaultValue(String(param.default?.value || ''))
    setIsAddingParameter(true)
  }

  const handleDeleteParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index))
  }

  const handleSaveParameter = () => {
    const newParam: TemplateParameter = {
      name: paramName,
      title: paramTitle || undefined,
      description: paramDescription || undefined,
      type: paramType,
      required: paramRequired,
      default: paramDefaultValue
        ? {
            '@type': paramType,
            value: convertDefaultValue(paramDefaultValue, paramType),
          }
        : undefined,
    }

    if (editingParameterIndex !== null) {
      // Update existing parameter
      const updatedParams = [...parameters]
      updatedParams[editingParameterIndex] = newParam
      setParameters(updatedParams)
      setEditingParameterIndex(null)
    } else {
      // Add new parameter
      setParameters([...parameters, newParam])
    }

    setIsAddingParameter(false)
    resetParameterForm()
  }

  const handleCancelParameter = () => {
    setIsAddingParameter(false)
    setEditingParameterIndex(null)
    resetParameterForm()
  }

  const convertDefaultValue = (value: string, type: string): unknown => {
    if (!value) return undefined

    switch (type) {
      case 'type.googleapis.com/google.protobuf.Int64Value':
        return parseInt(value) || 0
      case 'type.googleapis.com/google.protobuf.BoolValue':
        return value.toLowerCase() === 'true'
      case 'type.googleapis.com/google.protobuf.DoubleValue':
        return parseFloat(value) || 0.0
      default:
        return value
    }
  }

  const canSaveParameter = () => {
    return !!paramName && paramName.trim().length > 0
  }

  const formatTypeName = (type: string): string => {
    return type.replace('type.googleapis.com/google.protobuf.', '')
  }

  const renderStepContent = () => {
    switch (currentStep?.id) {
      case 'basic-info':
        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.5rem' }}>
              Template Information
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '1.5rem', fontSize: '0.95rem', marginTop: 0 }}>
              Provide basic information about the template.
            </p>

            <FormGroup label="Template ID" isRequired fieldId="template-id">
              <TextInput
                isRequired
                type="text"
                id="template-id"
                value={templateId}
                onChange={(_event, value) => setTemplateId(value)}
                placeholder="e.g., 'basic-vm-template', 'rhel-9-server'"
                validated={templateId && templateId.trim().length > 0 ? 'success' : 'default'}
              />
              <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                Unique identifier for the template (lowercase, alphanumeric, hyphens allowed)
              </div>
            </FormGroup>

            <FormGroup label="Title" isRequired fieldId="template-title" style={{ marginTop: '1rem' }}>
              <TextInput
                isRequired
                type="text"
                id="template-title"
                value={title}
                onChange={(_event, value) => setTitle(value)}
                placeholder="e.g., 'Basic VM Template', 'RHEL 9 Server Template'"
                validated={title && title.trim().length > 0 ? 'success' : 'default'}
              />
              <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                User-friendly display name for the template
              </div>
            </FormGroup>

            <FormGroup label="Description" fieldId="template-description" style={{ marginTop: '1rem' }}>
              <TextArea
                id="template-description"
                value={description}
                onChange={(_event, value) => setDescription(value)}
                placeholder="Describe what this template is for and when to use it..."
                rows={5}
              />
              <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                Optional description to help users understand the template's purpose
              </div>
            </FormGroup>
          </Form>
        )

      case 'parameters':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.25rem' }}>
                  Template Parameters
                </Title>
                <p style={{ color: '#6a6e73', fontSize: '0.95rem', marginTop: 0 }}>
                  Define configurable parameters for this template.
                </p>
              </div>
              {!isAddingParameter && (
                <Button variant="primary" onClick={handleAddParameter}>
                  Add Parameter
                </Button>
              )}
            </div>

            {isAddingParameter ? (
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="lg" style={{ marginBottom: '1rem' }}>
                    {editingParameterIndex !== null ? 'Edit Parameter' : 'New Parameter'}
                  </Title>
                  <Form>
                    {/* Parameter Mode Selection */}
                    {editingParameterIndex === null && (
                      <FormGroup label="Parameter Source" fieldId="param-mode" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <Radio
                            id="known-param-radio"
                            name="param-mode"
                            label="Select Known Parameter"
                            description="Choose from commonly used VM template parameters"
                            isChecked={parameterMode === 'known'}
                            onChange={() => setParameterMode('known')}
                          />
                          <Radio
                            id="custom-param-radio"
                            name="param-mode"
                            label="Create Custom Parameter"
                            description="Define your own parameter with custom settings"
                            isChecked={parameterMode === 'custom'}
                            onChange={() => setParameterMode('custom')}
                          />
                        </div>
                      </FormGroup>
                    )}

                    {/* Known Parameter Selection */}
                    {parameterMode === 'known' && editingParameterIndex === null && (
                      <FormGroup label="Select Parameter" isRequired fieldId="known-param">
                        <Dropdown
                          isOpen={knownParamDropdownOpen}
                          onSelect={(_, value) => handleSelectKnownParameter(value as string)}
                          onOpenChange={(isOpen) => setKnownParamDropdownOpen(isOpen)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              onClick={() => setKnownParamDropdownOpen(!knownParamDropdownOpen)}
                              isExpanded={knownParamDropdownOpen}
                              style={{ width: '100%' }}
                            >
                              {selectedKnownParam
                                ? KNOWN_PARAMETERS.find(p => p.name === selectedKnownParam)?.title || selectedKnownParam
                                : 'Select a parameter'}
                            </MenuToggle>
                          )}
                        >
                          <DropdownList>
                            {KNOWN_PARAMETERS.filter(kp => !parameters.some(p => p.name === kp.name)).map((param) => (
                              <DropdownItem key={param.name} value={param.name}>
                                <div>
                                  <strong>{param.title || param.name}</strong>
                                  {param.description && (
                                    <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                                      {param.description}
                                    </div>
                                  )}
                                </div>
                              </DropdownItem>
                            ))}
                          </DropdownList>
                        </Dropdown>
                        <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                          Select from commonly used VM template parameters
                        </div>
                      </FormGroup>
                    )}

                    {/* Show parameter fields only if custom mode or a known parameter is selected */}
                    {(parameterMode === 'custom' || selectedKnownParam) && (
                      <>
                    <FormGroup label="Parameter Name" isRequired fieldId="param-name">
                      <TextInput
                        isRequired
                        type="text"
                        id="param-name"
                        value={paramName}
                        onChange={(_event, value) => setParamName(value)}
                        placeholder="e.g., 'vm_cpu_cores', 'vm_memory_size'"
                        readOnly={parameterMode === 'known' && !!selectedKnownParam}
                      />
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                        Internal parameter name (snake_case recommended)
                      </div>
                    </FormGroup>

                    <FormGroup label="Title" fieldId="param-title" style={{ marginTop: '1rem' }}>
                      <TextInput
                        type="text"
                        id="param-title"
                        value={paramTitle}
                        onChange={(_event, value) => setParamTitle(value)}
                        placeholder="e.g., 'CPU Cores', 'Memory Size'"
                        readOnly={parameterMode === 'known' && !!selectedKnownParam}
                      />
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                        User-friendly display name (optional)
                      </div>
                    </FormGroup>

                    <FormGroup label="Description" fieldId="param-description" style={{ marginTop: '1rem' }}>
                      <TextArea
                        id="param-description"
                        value={paramDescription}
                        onChange={(_event, value) => setParamDescription(value)}
                        placeholder="Describe what this parameter controls..."
                        rows={3}
                        readOnly={parameterMode === 'known' && !!selectedKnownParam}
                      />
                    </FormGroup>

                    <FormGroup label="Type" isRequired fieldId="param-type" style={{ marginTop: '1rem' }}>
                      <Dropdown
                        isOpen={typeDropdownOpen}
                        onSelect={(_, value) => {
                          setParamType(value as string)
                          setTypeDropdownOpen(false)
                        }}
                        onOpenChange={(isOpen) => setTypeDropdownOpen(isOpen)}
                        toggle={(toggleRef) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                            isExpanded={typeDropdownOpen}
                            style={{ width: '100%' }}
                            isDisabled={parameterMode === 'known' && !!selectedKnownParam}
                          >
                            {formatTypeName(paramType)}
                          </MenuToggle>
                        )}
                      >
                        <DropdownList>
                          {PROTOBUF_TYPES.map((type) => (
                            <DropdownItem key={type} value={type}>
                              {formatTypeName(type)}
                            </DropdownItem>
                          ))}
                        </DropdownList>
                      </Dropdown>
                    </FormGroup>

                    <FormGroup label="Default Value" fieldId="param-default" style={{ marginTop: '1rem' }}>
                      <TextInput
                        type="text"
                        id="param-default"
                        value={paramDefaultValue}
                        onChange={(_event, value) => setParamDefaultValue(value)}
                        placeholder={
                          paramType.includes('Int64') || paramType.includes('Double')
                            ? 'e.g., 2, 4, 8'
                            : paramType.includes('Bool')
                            ? 'true or false'
                            : 'Default value'
                        }
                      />
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                        Optional default value for this parameter
                      </div>
                    </FormGroup>

                    <FormGroup fieldId="param-required" style={{ marginTop: '1rem' }}>
                      <Checkbox
                        id="param-required"
                        label="Required parameter"
                        description="Users must provide a value for this parameter when using the template"
                        isChecked={paramRequired}
                        onChange={(_event, checked) => setParamRequired(checked)}
                      />
                    </FormGroup>
                    </>
                    )}

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                      <Button variant="primary" onClick={handleSaveParameter} isDisabled={!canSaveParameter()}>
                        {editingParameterIndex !== null ? 'Update' : 'Add'} Parameter
                      </Button>
                      <Button variant="link" onClick={handleCancelParameter}>
                        Cancel
                      </Button>
                    </div>
                  </Form>
                </CardBody>
              </Card>
            ) : parameters.length === 0 ? (
              <Card>
                <CardBody>
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6a6e73' }}>
                    <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No parameters defined</p>
                    <p style={{ fontSize: '0.95rem' }}>
                      Parameters allow users to customize VMs created from this template. Click "Add Parameter" to get started.
                    </p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <Table aria-label="Parameters table" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Title</Th>
                      <Th>Type</Th>
                      <Th>Required</Th>
                      <Th>Default</Th>
                      <Th></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {parameters.map((param, index) => (
                      <Tr key={index}>
                        <Td dataLabel="Name">
                          <code style={{ fontSize: '0.9rem' }}>{param.name}</code>
                        </Td>
                        <Td dataLabel="Title">{param.title || '-'}</Td>
                        <Td dataLabel="Type">{formatTypeName(param.type || 'StringValue')}</Td>
                        <Td dataLabel="Required">{param.required ? 'Yes' : 'No'}</Td>
                        <Td dataLabel="Default">
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {param.default?.value !== undefined && param.default?.value !== null
                              ? param.default.value === ''
                                ? '(empty)'
                                : String(param.default.value)
                              : '-'}
                          </span>
                        </Td>
                        <Td isActionCell>
                          <ActionsColumn
                            items={[
                              {
                                title: 'Edit',
                                onClick: () => handleEditParameter(index),
                              },
                              {
                                title: 'Delete',
                                onClick: () => handleDeleteParameter(index),
                              },
                            ]}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            )}
          </div>
        )

      case 'review':
        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.75rem' }}>
              Review Template Configuration
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Review the template configuration before creating.
            </p>

            {isCreating && (
              <Alert
                variant={AlertVariant.info}
                isInline
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Spinner size="md" />
                    <span>Creating template...</span>
                  </div>
                }
                style={{ marginBottom: '1.5rem' }}
              />
            )}

            {creationError && (
              <Alert
                variant={AlertVariant.danger}
                isInline
                title="Failed to create template"
                style={{ marginBottom: '1.5rem' }}
              >
                {creationError}
              </Alert>
            )}

            <Card style={{ marginBottom: '1.5rem' }}>
              <CardBody>
                <Title headingLevel="h4" size="md" style={{ marginBottom: '0.75rem' }}>
                  Basic Information
                </Title>
                <DescriptionList isHorizontal isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm style={{ minWidth: '150px' }}>Template ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{templateId}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm style={{ minWidth: '150px' }}>Title</DescriptionListTerm>
                    <DescriptionListDescription>{title}</DescriptionListDescription>
                  </DescriptionListGroup>
                  {description && (
                    <DescriptionListGroup>
                      <DescriptionListTerm style={{ minWidth: '150px' }}>Description</DescriptionListTerm>
                      <DescriptionListDescription style={{ whiteSpace: 'pre-wrap' }}>
                        {description}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                </DescriptionList>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Title headingLevel="h4" size="md" style={{ marginBottom: '0.75rem' }}>
                  Parameters ({parameters.length})
                </Title>
                {parameters.length === 0 ? (
                  <p style={{ color: '#6a6e73', fontStyle: 'italic' }}>No parameters defined</p>
                ) : (
                  <Table aria-label="Parameters review" variant="compact" borders={true}>
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Title</Th>
                        <Th>Type</Th>
                        <Th>Required</Th>
                        <Th>Default</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {parameters.map((param, index) => (
                        <Tr key={index}>
                          <Td dataLabel="Name">
                            <code style={{ fontSize: '0.9rem' }}>{param.name}</code>
                          </Td>
                          <Td dataLabel="Title">{param.title || '-'}</Td>
                          <Td dataLabel="Type">{formatTypeName(param.type || 'StringValue')}</Td>
                          <Td dataLabel="Required">{param.required ? 'Yes' : 'No'}</Td>
                          <Td dataLabel="Default">
                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {param.default?.value !== undefined && param.default?.value !== null
                                ? param.default.value === ''
                                  ? '(empty)'
                                  : String(param.default.value)
                                : '-'}
                            </span>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
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
      aria-label="Create template wizard"
    >
      <ModalHeader title="Create Template" />
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
        <div style={{ minHeight: '500px', maxHeight: '500px', overflowY: 'auto', paddingRight: '1rem' }}>
          {renderStepContent()}
        </div>
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
