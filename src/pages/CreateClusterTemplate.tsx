import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PageSection,
  Title,
  Form,
  FormGroup,
  TextInput,
  TextArea,
  Button,
  Card,
  CardBody,
  Checkbox,
  Alert,
  AlertVariant,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Breadcrumb,
  BreadcrumbItem,
} from '@patternfly/react-core'
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table'
import AppLayout from '../components/layouts/AppLayout'
import { createClusterTemplate } from '../api/clusterTemplates'
import { getClusterTemplates } from '../api/clusterTemplates'
import { ClusterTemplateParameterDefinition, ClusterTemplateNodeSet } from '../api/types'
import { PlusCircleIcon, TrashIcon } from '@patternfly/react-icons'
import { logger } from '@/utils/logger'

const PROTOBUF_TYPES = [
  'type.googleapis.com/google.protobuf.StringValue',
  'type.googleapis.com/google.protobuf.Int32Value',
  'type.googleapis.com/google.protobuf.Int64Value',
  'type.googleapis.com/google.protobuf.BoolValue',
  'type.googleapis.com/google.protobuf.DoubleValue',
]

// Mandatory parameters that will be auto-included
const MANDATORY_PARAMETERS: ClusterTemplateParameterDefinition[] = [
  {
    name: 'cluster_name',
    title: 'Cluster Name',
    description: 'The name of the OpenShift cluster',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: true,
  },
  {
    name: 'pull_secret',
    title: 'Pull Secret',
    description: 'The pull secret contains credentials for authenticating to image repositories.',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: true,
  },
  {
    name: 'ssh_public_key',
    title: 'SSH Public Key',
    description: 'A public ssh key that will be installed into the authorized_keys file of the core user on cluster worker nodes.',
    type: 'type.googleapis.com/google.protobuf.StringValue',
    required: true,
  },
]

interface CustomParameter {
  key: string
  defaultValue: string
  description: string
  type: string
}

const OPENSHIFT_VERSIONS = ['4.20', '4.19', '4.18', '4.17']

const CreateClusterTemplate: React.FC = () => {
  const navigate = useNavigate()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)

  // Basic fields
  const [templateId, setTemplateId] = useState('')
  const [templateIdError, setTemplateIdError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [openshiftVersion, setOpenshiftVersion] = useState('4.20')
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false)

  // Node sets
  const [hostClass, setHostClass] = useState('')
  const [nodeCount, setNodeCount] = useState('3')
  const [hostClassDropdownOpen, setHostClassDropdownOpen] = useState(false)

  // Available host classes from templates
  const [availableHostClasses, setAvailableHostClasses] = useState<string[]>([])

  // Custom parameters
  const [addCustomParameters, setAddCustomParameters] = useState(false)
  const [customParameters, setCustomParameters] = useState<CustomParameter[]>([])
  const [isAddingParameter, setIsAddingParameter] = useState(false)
  const [paramKey, setParamKey] = useState('')
  const [paramDefaultValue, setParamDefaultValue] = useState('')
  const [paramDescription, setParamDescription] = useState('')
  const [paramType, setParamType] = useState('type.googleapis.com/google.protobuf.StringValue')
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)

  // Error states
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  // Load available host classes
  useEffect(() => {
    const loadHostClasses = async () => {
      try {
        const templates = await getClusterTemplates()
        const hostClassesSet = new Set<string>()
        templates.forEach(template => {
          if (template.node_sets) {
            Object.values(template.node_sets).forEach(nodeSet => {
              if (nodeSet.host_class) {
                hostClassesSet.add(nodeSet.host_class)
              }
            })
          }
        })
        const classes = Array.from(hostClassesSet).sort()
        setAvailableHostClasses(classes)
        if (classes.length > 0 && !hostClass) {
          setHostClass(classes[0])
        }
      } catch (err) {
        logger.error('Failed to load host classes', err)
      }
    }
    loadHostClasses()
  }, [hostClass])

  // Validate snake_case with dots
  const isValidSnakeCase = (str: string): boolean => {
    return /^[a-z][a-z0-9_.]*$/.test(str)
  }

  const handleTemplateIdChange = (value: string) => {
    setTemplateId(value)
    if (value && !isValidSnakeCase(value)) {
      setTemplateIdError('Template ID must be in snake_case (lowercase letters, numbers, dots, and underscores only, no spaces)')
    } else {
      setTemplateIdError(null)
    }
  }

  const handleKeyChange = (value: string) => {
    setParamKey(value)
    if (value && !isValidSnakeCase(value)) {
      setKeyError('Parameter key must be in snake_case (lowercase letters, numbers, and underscores only)')
    } else {
      setKeyError(null)
    }
  }

  const addParameter = () => {
    if (!paramKey || keyError) {
      return
    }

    // Check if key already exists
    if (customParameters.some(p => p.key === paramKey)) {
      setKeyError('Parameter with this key already exists')
      return
    }

    // Check if it conflicts with mandatory parameters
    if (MANDATORY_PARAMETERS.some(p => p.name === paramKey)) {
      setKeyError('This parameter name is reserved for mandatory parameters')
      return
    }

    const newParam: CustomParameter = {
      key: paramKey,
      defaultValue: paramDefaultValue,
      description: paramDescription,
      type: paramType,
    }

    setCustomParameters([...customParameters, newParam])

    // Reset form
    setParamKey('')
    setParamDefaultValue('')
    setParamDescription('')
    setParamType('type.googleapis.com/google.protobuf.StringValue')
    setKeyError(null)
    setIsAddingParameter(false)
  }

  const deleteParameter = (index: number) => {
    setCustomParameters(customParameters.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    setError(null)
    setIsCreating(true)

    try {
      // Build parameters list
      const parameters = [...MANDATORY_PARAMETERS]

      // Add custom parameters if any
      customParameters.forEach(param => {
        const paramDef: ClusterTemplateParameterDefinition = {
          name: param.key,
          title: param.key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: param.description,
          type: param.type,
          required: false,
        }

        if (param.defaultValue) {
          paramDef.default = {
            '@type': param.type,
            value: param.type.includes('Int') ? parseInt(param.defaultValue) : param.defaultValue,
          }
        }

        parameters.push(paramDef)
      })

      // Build node sets - use host class as the node set name
      const nodeSets: Record<string, ClusterTemplateNodeSet> = {
        [hostClass]: {
          host_class: hostClass,
          size: parseInt(nodeCount, 10),
        },
      }

      // Build template - @type and metadata are automatically added by the server
      const templateData: Record<string, unknown> = {
        id: templateId,
        title: title,
        description: description,
        version: openshiftVersion,
        parameters: parameters,
        node_sets: nodeSets,
      }

      await createClusterTemplate(templateData)

      // Navigate back to catalog
      navigate('/admin/cluster-catalog')
    } catch (err: unknown) {
      logger.error('Failed to create template', err)
      setError((err as { message?: string })?.message || 'Failed to create cluster template')
    } finally {
      setIsCreating(false)
    }
  }

  const canProceedStep1 = templateId && !templateIdError && title && hostClass && nodeCount
  const canCreate = canProceedStep1

  const totalSteps = addCustomParameters ? 2 : 1
  const isLastStep = currentStep === totalSteps

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <AppLayout>
      <PageSection style={{ backgroundColor: '#f5f5f5', paddingBottom: '1rem' }}>
        <Breadcrumb>
          <BreadcrumbItem>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/admin/cluster-catalog') }}>
              Cluster Catalog
            </a>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>
            Create Cluster Template
          </BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" size="2xl" style={{ marginTop: '1rem' }}>
          Create Cluster Template from Template: {title || 'New Template'}
        </Title>
        <p style={{ color: '#6a6e73', marginTop: '0.5rem' }}>
          Define a new cluster template with customizable parameters and node configurations
        </p>
      </PageSection>

      <PageSection>
        {error && (
          <Alert variant={AlertVariant.danger} isInline title="Error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </Alert>
        )}

        <div style={{ display: 'flex', gap: '2rem' }}>
          {/* Left sidebar with steps */}
          <div style={{ flex: '0 0 280px' }}>
            <Card
              isSelectable
              isSelected={currentStep === 1}
              onClick={() => setCurrentStep(1)}
              style={{
                cursor: 'pointer',
                border: currentStep === 1 ? '2px solid #0066cc' : '1px solid #d2d2d2',
                marginBottom: '0.5rem',
              }}
            >
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: currentStep === 1 ? '#0066cc' : '#d2d2d2',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    1
                  </div>
                  <span style={{ fontWeight: currentStep === 1 ? 500 : 400, fontSize: '0.95rem' }}>Template details</span>
                </div>
              </CardBody>
            </Card>

            {addCustomParameters && (
              <Card
                isSelectable
                isSelected={currentStep === 2}
                onClick={() => canProceedStep1 && setCurrentStep(2)}
                style={{
                  cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
                  border: currentStep === 2 ? '2px solid #0066cc' : '1px solid #d2d2d2',
                  opacity: canProceedStep1 ? 1 : 0.6,
                }}
              >
                <CardBody>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: currentStep === 2 ? '#0066cc' : '#d2d2d2',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 600,
                      }}
                    >
                      2
                    </div>
                    <span style={{ fontWeight: currentStep === 2 ? 500 : 400, fontSize: '0.95rem' }}>Custom parameters</span>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Main content */}
          <div style={{ flex: 1 }}>

        <Card>
          <CardBody>
            {currentStep === 1 && (
              <Form style={{ maxWidth: '700px' }}>
                <FormGroup label="Template ID" isRequired fieldId="template-id">
                  <TextInput
                    id="template-id"
                    value={templateId}
                    onChange={(_event, value) => handleTemplateIdChange(value)}
                    placeholder="e.g., osac.templates.my_cluster"
                    validated={templateIdError ? 'error' : 'default'}
                    isRequired
                  />
                  {!templateIdError && (
                    <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                      Must be in snake_case (lowercase letters, numbers, dots, and underscores only, no spaces)
                    </div>
                  )}
                  {templateIdError && (
                    <div style={{ fontSize: '0.875rem', color: '#c9190b', marginTop: '0.25rem' }}>
                      {templateIdError}
                    </div>
                  )}
                </FormGroup>

                <FormGroup label="Title" isRequired fieldId="template-title">
                  <TextInput
                    id="template-title"
                    value={title}
                    onChange={(_event, value) => setTitle(value)}
                    placeholder="e.g., My Custom Cluster"
                    isRequired
                  />
                </FormGroup>

                <FormGroup label="Description" fieldId="template-description">
                  <TextArea
                    id="template-description"
                    value={description}
                    onChange={(_event, value) => setDescription(value)}
                    placeholder="Describe the purpose and features of this cluster template"
                    rows={3}
                  />
                </FormGroup>

                <FormGroup label="OpenShift Version" isRequired fieldId="openshift-version">
                  <Dropdown
                    isOpen={versionDropdownOpen}
                    onSelect={() => setVersionDropdownOpen(false)}
                    onOpenChange={(isOpen) => setVersionDropdownOpen(isOpen)}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                        isExpanded={versionDropdownOpen}
                        style={{ width: '100%' }}
                      >
                        {openshiftVersion}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {OPENSHIFT_VERSIONS.map(version => (
                        <DropdownItem key={version} onClick={() => setOpenshiftVersion(version)}>
                          {version}
                        </DropdownItem>
                      ))}
                    </DropdownList>
                  </Dropdown>
                </FormGroup>

                <Title headingLevel="h3" size="md" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                  Node Set Configuration
                </Title>

                <FormGroup label="Host Class" isRequired fieldId="host-class">
                  <Dropdown
                    isOpen={hostClassDropdownOpen}
                    onSelect={() => setHostClassDropdownOpen(false)}
                    onOpenChange={(isOpen) => setHostClassDropdownOpen(isOpen)}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setHostClassDropdownOpen(!hostClassDropdownOpen)}
                        isExpanded={hostClassDropdownOpen}
                        style={{ width: '100%' }}
                      >
                        {hostClass || 'Select host class'}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {availableHostClasses.map(hc => (
                        <DropdownItem key={hc} onClick={() => setHostClass(hc)}>
                          {hc}
                        </DropdownItem>
                      ))}
                    </DropdownList>
                  </Dropdown>
                </FormGroup>

                <FormGroup label="Node Count" isRequired fieldId="node-count">
                  <TextInput
                    id="node-count"
                    type="number"
                    value={nodeCount}
                    onChange={(_event, value) => setNodeCount(value)}
                    min={1}
                    isRequired
                  />
                </FormGroup>

                <Alert variant={AlertVariant.info} isInline title="Mandatory Parameters" style={{ marginTop: '2rem' }}>
                  This template will automatically include the following required parameters: <strong>cluster_name</strong>, <strong>pull_secret</strong>, and <strong>ssh_public_key</strong>.
                </Alert>

                <Checkbox
                  id="add-custom-params"
                  label="Add custom parameters"
                  description="Define additional template parameters with default values and descriptions"
                  isChecked={addCustomParameters}
                  onChange={(_event, checked) => setAddCustomParameters(checked)}
                  style={{ marginTop: '1rem' }}
                />
              </Form>
            )}

            {currentStep === 2 && (
              <Form style={{ maxWidth: '700px' }}>
                {!isAddingParameter && (
                    <Button
                      variant="secondary"
                      icon={<PlusCircleIcon />}
                      onClick={() => setIsAddingParameter(true)}
                      style={{ marginBottom: '1rem' }}
                    >
                      Add Parameter
                    </Button>
                  )}

                  {isAddingParameter && (
                    <Card style={{ marginBottom: '1rem', backgroundColor: '#f5f5f5' }}>
                      <CardBody>
                        <FormGroup
                          label="Parameter Key"
                          isRequired
                          fieldId="param-key"
                        >
                          <TextInput
                            id="param-key"
                            value={paramKey}
                            onChange={(_event, value) => handleKeyChange(value)}
                            placeholder="e.g., ocp_version"
                            validated={keyError ? 'error' : 'default'}
                            isRequired
                          />
                          {!keyError && (
                            <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                              Must be in snake_case (e.g., ocp_version, node_size)
                            </div>
                          )}
                          {keyError && (
                            <div style={{ fontSize: '0.875rem', color: '#c9190b', marginTop: '0.25rem' }}>
                              {keyError}
                            </div>
                          )}
                        </FormGroup>

                        <FormGroup label="Default Value" fieldId="param-default">
                          <TextInput
                            id="param-default"
                            value={paramDefaultValue}
                            onChange={(_event, value) => setParamDefaultValue(value)}
                            placeholder="Optional default value"
                          />
                        </FormGroup>

                        <FormGroup label="Description" fieldId="param-description">
                          <TextArea
                            id="param-description"
                            value={paramDescription}
                            onChange={(_event, value) => setParamDescription(value)}
                            placeholder="Describe what this parameter is used for"
                            rows={2}
                          />
                        </FormGroup>

                        <FormGroup label="Type" isRequired fieldId="param-type">
                          <Dropdown
                            isOpen={typeDropdownOpen}
                            onSelect={() => setTypeDropdownOpen(false)}
                            onOpenChange={(isOpen) => setTypeDropdownOpen(isOpen)}
                            toggle={(toggleRef) => (
                              <MenuToggle
                                ref={toggleRef}
                                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                                isExpanded={typeDropdownOpen}
                                style={{ width: '100%' }}
                              >
                                {paramType.split('/').pop()}
                              </MenuToggle>
                            )}
                          >
                            <DropdownList>
                              {PROTOBUF_TYPES.map(type => (
                                <DropdownItem key={type} onClick={() => setParamType(type)}>
                                  {type.split('/').pop()}
                                </DropdownItem>
                              ))}
                            </DropdownList>
                          </Dropdown>
                        </FormGroup>

                        <div style={{ marginTop: '1rem' }}>
                          <Button
                            variant="primary"
                            onClick={addParameter}
                            isDisabled={!paramKey || !!keyError}
                            style={{ marginRight: '0.5rem' }}
                          >
                            Add
                          </Button>
                          <Button variant="link" onClick={() => {
                            setIsAddingParameter(false)
                            setParamKey('')
                            setParamDefaultValue('')
                            setParamDescription('')
                            setKeyError(null)
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  )}

                {customParameters.length > 0 && (
                  <Table variant="compact" style={{ marginTop: '1rem' }}>
                    <Thead>
                      <Tr>
                        <Th>Key</Th>
                        <Th>Default Value</Th>
                        <Th>Type</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {customParameters.map((param, index) => (
                        <Tr key={index}>
                          <Td><code>{param.key}</code></Td>
                          <Td>{param.defaultValue || <span style={{ color: '#6a6e73', fontStyle: 'italic' }}>None</span>}</Td>
                          <Td><code style={{ fontSize: '0.75rem' }}>{param.type.split('/').pop()}</code></Td>
                          <Td isActionCell>
                            <Button
                              variant="plain"
                              icon={<TrashIcon />}
                              onClick={() => deleteParameter(index)}
                              aria-label="Delete parameter"
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </Form>
            )}
          </CardBody>
        </Card>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          {currentStep > 1 && (
            <Button variant="secondary" onClick={handleBack} isDisabled={isCreating}>
              Back
            </Button>
          )}
          {!isLastStep && (
            <Button
              variant="primary"
              onClick={handleNext}
              isDisabled={!canProceedStep1}
            >
              Next
            </Button>
          )}
          {isLastStep && (
            <Button
              variant="primary"
              onClick={handleCreate}
              isDisabled={!canCreate || isCreating}
              isLoading={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Template'}
            </Button>
          )}
          <Button variant="link" onClick={() => navigate('/admin/cluster-catalog')} isDisabled={isCreating}>
            Cancel
          </Button>
        </div>

          </div>
        </div>
      </PageSection>
    </AppLayout>
  )
}

export default CreateClusterTemplate
