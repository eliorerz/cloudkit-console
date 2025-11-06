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
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core'
import { Template, TemplateParameter } from '../../api/types'

interface CreateVMWizardProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (vmId: string, templateId: string, parameters: Record<string, any>) => Promise<void>
  templates: Template[]
}

export const CreateVMWizard: React.FC<CreateVMWizardProps> = ({
  isOpen,
  onClose,
  onCreate,
  templates,
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [useTemplate, setUseTemplate] = useState(true)
  const [vmId, setVmId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
  const [templateParameters, setTemplateParameters] = useState<Record<string, any>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [activeParamTab, setActiveParamTab] = useState('general')

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  // Categorize parameters based on their names
  const categorizeParameters = (parameters: TemplateParameter[]) => {
    const categories: Record<string, TemplateParameter[]> = {
      general: [],
      hardware: [],
      network: [],
      storage: [],
      other: [],
    }

    parameters.forEach(param => {
      const name = param.name.toLowerCase()
      const title = (param.title || '').toLowerCase()

      // Hardware-related: CPU, memory, cores
      if (name.includes('cpu') || name.includes('memory') || name.includes('ram') ||
          name.includes('core') || name.includes('vcpu') ||
          title.includes('cpu') || title.includes('memory') || title.includes('core')) {
        categories.hardware.push(param)
      }
      // Network-related: network, IP, MAC, interface
      else if (name.includes('network') || name.includes('ip') || name.includes('mac') ||
               name.includes('interface') || name.includes('vlan') ||
               title.includes('network') || title.includes('ip')) {
        categories.network.push(param)
      }
      // Storage-related: disk, storage, volume
      else if (name.includes('disk') || name.includes('storage') || name.includes('volume') ||
               name.includes('image') ||
               title.includes('disk') || title.includes('storage') || title.includes('image')) {
        categories.storage.push(param)
      }
      // General: name, OS, description
      else if (name.includes('name') || name.includes('os') || name.includes('description') ||
               name.includes('ssh') || name.includes('cloud_init') || name.includes('config') ||
               title.includes('name') || title.includes('ssh')) {
        categories.general.push(param)
      }
      else {
        categories.other.push(param)
      }
    })

    return categories
  }

  // Calculate total steps dynamically based on template selection and categories
  const getTotalSteps = () => {
    if (!useTemplate) return 2 // Method + Create
    if (!selectedTemplateId) return 2 // Method + Template

    const categorized = selectedTemplate?.parameters ? categorizeParameters(selectedTemplate.parameters) : null
    if (!categorized) return 4 // Method + Template + VM Name + Review

    let steps = 3 // Method + Template + VM Name
    if (categorized.general.length > 0) steps++
    if (categorized.hardware.length > 0) steps++
    if (categorized.network.length > 0) steps++
    if (categorized.storage.length > 0) steps++
    if (categorized.other.length > 0) steps++
    steps++ // Review
    return steps
  }

  const totalSteps = getTotalSteps()
  const progressValue = ((currentStep + 1) / totalSteps) * 100

  const handleClose = () => {
    if (!isCreating) {
      setCurrentStep(0)
      setVmId('')
      setSelectedTemplateId('')
      setTemplateParameters({})
      setUseTemplate(true)
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
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = async () => {
    try {
      setIsCreating(true)
      await onCreate(vmId, selectedTemplateId, templateParameters)
      handleClose()
    } catch (error) {
      console.error('Failed to create VM:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return useTemplate
      case 1:
        return !!vmId && !!selectedTemplateId
      case 2:
        return true
      case 3:
        return true
      default:
        return false
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
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
          </div>
        )
      case 1:
        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              Select a template and name your VM
            </Title>
            <FormGroup label="Virtual machine name" isRequired fieldId="vm-name">
              <TextInput
                isRequired
                type="text"
                id="vm-name"
                value={vmId}
                onChange={(_event, value) => setVmId(value)}
                placeholder="e.g., my-fedora-vm"
              />
              <p style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                A unique identifier for your virtual machine
              </p>
            </FormGroup>
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
      case 2:
        if (!selectedTemplate?.parameters || selectedTemplate.parameters.length === 0) {
          return (
            <div>
              <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
                Configure template parameters
              </Title>
              <p style={{ color: '#6a6e73' }}>This template has no configurable parameters.</p>
            </div>
          )
        }

        const categorized = categorizeParameters(selectedTemplate.parameters)
        const renderParameterFields = (params: TemplateParameter[]) => (
          <>
            {params.map((param) => (
              <FormGroup
                key={param.name}
                label={param.title || param.name}
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
                {param.description && (
                  <p style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                    {param.description}
                  </p>
                )}
              </FormGroup>
            ))}
          </>
        )

        return (
          <Form>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              Configure template parameters
            </Title>
            <p style={{ color: '#6a6e73', marginBottom: '1.5rem' }}>
              Customize the settings for your virtual machine. Fields marked with * are required.
            </p>
            <Tabs
              activeKey={activeParamTab}
              onSelect={(_event, tabKey) => setActiveParamTab(tabKey as string)}
            >
              {categorized.general.length > 0 && (
                <Tab
                  eventKey="general"
                  title={<TabTitleText>General</TabTitleText>}
                >
                  <div style={{ paddingTop: '1.5rem' }}>
                    {renderParameterFields(categorized.general)}
                  </div>
                </Tab>
              )}
              {categorized.hardware.length > 0 && (
                <Tab
                  eventKey="hardware"
                  title={<TabTitleText>Hardware</TabTitleText>}
                >
                  <div style={{ paddingTop: '1.5rem' }}>
                    {renderParameterFields(categorized.hardware)}
                  </div>
                </Tab>
              )}
              {categorized.network.length > 0 && (
                <Tab
                  eventKey="network"
                  title={<TabTitleText>Network</TabTitleText>}
                >
                  <div style={{ paddingTop: '1.5rem' }}>
                    {renderParameterFields(categorized.network)}
                  </div>
                </Tab>
              )}
              {categorized.storage.length > 0 && (
                <Tab
                  eventKey="storage"
                  title={<TabTitleText>Storage</TabTitleText>}
                >
                  <div style={{ paddingTop: '1.5rem' }}>
                    {renderParameterFields(categorized.storage)}
                  </div>
                </Tab>
              )}
              {categorized.other.length > 0 && (
                <Tab
                  eventKey="other"
                  title={<TabTitleText>Other</TabTitleText>}
                >
                  <div style={{ paddingTop: '1.5rem' }}>
                    {renderParameterFields(categorized.other)}
                  </div>
                </Tab>
              )}
            </Tabs>
          </Form>
        )
      case 3:
        return (
          <div>
            <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
              Review your configuration
            </Title>
            <Card>
              <CardBody>
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>VM Name</DescriptionListTerm>
                    <DescriptionListDescription>
                      <strong>{vmId}</strong>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Template</DescriptionListTerm>
                    <DescriptionListDescription>
                      <strong>{selectedTemplate?.title || selectedTemplateId}</strong>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  {selectedTemplate?.parameters && selectedTemplate.parameters.length > 0 && (
                    <>
                      <DescriptionListGroup>
                        <DescriptionListTerm>
                          <strong>Parameters</strong>
                        </DescriptionListTerm>
                        <DescriptionListDescription> </DescriptionListDescription>
                      </DescriptionListGroup>
                      {selectedTemplate.parameters.map((param) => (
                        <DescriptionListGroup key={param.name} style={{ marginLeft: '2rem' }}>
                          <DescriptionListTerm>{param.title || param.name}</DescriptionListTerm>
                          <DescriptionListDescription>
                            {templateParameters[param.name] || param.default?.value || '(not set)'}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      ))}
                    </>
                  )}
                </DescriptionList>
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
      aria-label="Create virtual machine wizard"
    >
      <ModalHeader title="Create virtual machine" />
      <ModalBody>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
              Step {currentStep + 1} of {totalSteps}: {['Creation method', 'Select template', 'Configure parameters', 'Review'][currentStep]}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
              {Math.round(progressValue)}%
            </span>
          </div>
          <Progress
            value={progressValue}
            measureLocation={ProgressMeasureLocation.none}
            variant={currentStep === totalSteps - 1 ? ProgressVariant.success : undefined}
          />
        </div>
        <div style={{ minHeight: '400px' }}>{renderStepContent()}</div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={currentStep === totalSteps - 1 ? handleCreate : handleNext}
          isDisabled={!canProceed() || isCreating}
          isLoading={isCreating}
        >
          {currentStep === totalSteps - 1 ? (isCreating ? 'Creating...' : 'Create') : 'Next'}
        </Button>
        {currentStep > 0 && (
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
