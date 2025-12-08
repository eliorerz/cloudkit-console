import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormGroup,
  FormSection,
  TextInput,
  TextArea,
  Checkbox,
  NumberInput,
  Button,
  Alert,
  Spinner,
  Card,
  CardBody,
  ActionGroup,
  Popover,
  Divider,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core'
import { HelpIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { listClusterTemplates, createCluster } from '../api/clustersApi'
import { ClusterTemplate, Tenant } from '../api/types'
import { listTenants } from '../api/tenants'
import { formatDescriptionText } from '../utils/formatText'
import { logger } from '@/utils/logger'

interface HostClassInfo {
  name: string
  description: string
  category: string
  cpu: {
    type: string
    cores: number
    sockets: number
    threadsPerCore: number
  }
  ram: {
    size: string
    type: string
  }
  disk: {
    type: string
    size: string
    interface: string
  }
  gpu: {
    model?: string
    count?: number
    memory?: string
  } | null
}

const ClusterCreate: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const templateId = searchParams.get('template')

  const [template, setTemplate] = useState<ClusterTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [hostClasses, setHostClasses] = useState<Record<string, HostClassInfo>>({})

  // Form state
  const [clusterName, setClusterName] = useState('')
  const [pullSecret, setPullSecret] = useState('')
  const [parameters, setParameters] = useState<Record<string, unknown>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [hasDefaults, setHasDefaults] = useState(false)

  // Tenant selection state
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [isTenantSelectOpen, setIsTenantSelectOpen] = useState(false)

  const loadTenants = async () => {
    try {
      setLoadingTenants(true)
      const response = await listTenants()
      setTenants(response.items || [])
    } catch (err) {
      logger.error('Failed to load tenants', err)
      // Non-critical, just log the error
    } finally {
      setLoadingTenants(false)
    }
  }

  const loadHostClasses = async () => {
    try {
      const response = await fetch('/api/host-classes')
      const data = await response.json()
      setHostClasses(data)
    } catch (err) {
      logger.error('Failed to load host classes', err)
      // Non-critical, just log the error
    }
  }

  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setError('No template specified')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // List templates and find the one we need
      const response = await listClusterTemplates()
      const foundTemplate = response.items?.find(t => t.id === templateId)

      if (!foundTemplate) {
        setError(`Template '${templateId}' not found`)
        return
      }

      setTemplate(foundTemplate)

      // Initialize parameter defaults
      const initialParams: Record<string, unknown> = {}
      if (foundTemplate.parameters) {
        foundTemplate.parameters.forEach(param => {
          if (param.default !== undefined) {
            initialParams[param.name] = param.default
          }
        })
      }
      setParameters(initialParams)
    } catch (err: unknown) {
      logger.error('Failed to load template', err)
      const error = err as { message?: string }
      setError(error.message || 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    // Load default values from localStorage
    const defaultPullSecret = localStorage.getItem('default_pull_secret')
    const defaultSshKey = localStorage.getItem('default_ssh_key')

    if (defaultPullSecret) {
      setPullSecret(defaultPullSecret)
    }

    if (defaultPullSecret || defaultSshKey) {
      setHasDefaults(true)
      // Also set the ssh key in parameters if it exists
      if (defaultSshKey) {
        setParameters(prev => ({
          ...prev,
          ssh_public_key: defaultSshKey
        }))
      }
    }

    loadTemplate()
    loadHostClasses()
    loadTenants()
  }, [loadTemplate])

  const handleParameterChange = (paramName: string, value: unknown) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value,
    }))
  }

  // Helper function to wrap parameter values in google.protobuf.Any format
  const wrapParameterValue = (type: string, value: unknown) => {
    // If type already contains the full type URL, use it directly
    if (type.startsWith('type.googleapis.com/')) {
      return {
        '@type': type,
        value: value
      }
    }

    // Otherwise map from short names to full type URLs
    const typeMap: Record<string, string> = {
      'string': 'type.googleapis.com/google.protobuf.StringValue',
      'int32': 'type.googleapis.com/google.protobuf.Int32Value',
      'bool': 'type.googleapis.com/google.protobuf.BoolValue',
      'int64': 'type.googleapis.com/google.protobuf.Int64Value',
      'float': 'type.googleapis.com/google.protobuf.FloatValue',
      'double': 'type.googleapis.com/google.protobuf.DoubleValue',
    }

    const typeUrl = typeMap[type] || 'type.googleapis.com/google.protobuf.StringValue'
    return {
      '@type': typeUrl,
      value: value
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!template) return

    // Validate required fields
    if (!clusterName.trim()) {
      setError('Cluster name is required')
      return
    }

    if (!pullSecret.trim()) {
      setError('Pull secret is required')
      return
    }

    // Validate required parameters
    const missingParams: string[] = []
    if (template.parameters) {
      template.parameters.forEach(param => {
        // Skip pull_secret as it's validated separately above
        if (param.name === 'pull_secret') return

        if (param.required && (parameters[param.name] === undefined || parameters[param.name] === '')) {
          missingParams.push(param.title || param.name)
        }
      })
    }

    if (missingParams.length > 0) {
      setError(`Missing required parameters: ${missingParams.join(', ')}`)
      return
    }

    try {
      setCreating(true)
      setError(null)

      // Wrap all parameters in google.protobuf.Any format
      const wrappedParameters: Record<string, unknown> = {}
      if (template.parameters) {
        template.parameters.forEach(param => {
          const value = param.name === 'pull_secret' ? pullSecret : parameters[param.name]
          if (value !== undefined && value !== '') {
            const wrapped = wrapParameterValue(param.type || 'string', value)
            logger.debug(`Wrapping parameter ${param.name} (type: ${param.type})`, { value, wrapped })
            wrappedParameters[param.name] = wrapped
          }
        })
      }

      logger.debug('Wrapped parameters', wrappedParameters)

      // Build cluster spec with optional tenants
      const metadata: Record<string, unknown> = {
        name: clusterName,
      }

      // Add tenants to metadata if any are selected
      if (selectedTenants.length > 0) {
        metadata.tenants = selectedTenants
      }

      const clusterSpec = {
        metadata: metadata,
        spec: {
          template: template.id,
          template_parameters: wrappedParameters,
        },
      }

      const newCluster = await createCluster(clusterSpec)

      // Redirect to cluster detail page
      navigate(`/admin/clusters/${newCluster.id}`)
    } catch (err: unknown) {
      logger.error('Failed to create cluster', err)
      setError((err as { message?: string })?.message || 'Failed to create cluster')
    } finally {
      setCreating(false)
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
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
          <Button variant="primary" onClick={() => navigate('/admin/cluster-catalog')} style={{ marginTop: '1rem' }}>
            Back to Catalog
          </Button>
        </PageSection>
      </AppLayout>
    )
  }

  if (!template) {
    return (
      <AppLayout>
        <PageSection>
          <Alert variant="warning" title="Template not found">
            The requested template could not be found.
          </Alert>
          <Button variant="primary" onClick={() => navigate('/admin/cluster-catalog')} style={{ marginTop: '1rem' }}>
            Back to Catalog
          </Button>
        </PageSection>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageSection variant="default" style={{ maxWidth: '800px' }}>
        <Breadcrumb>
          <BreadcrumbItem to="/admin/cluster-catalog" onClick={(e) => { e.preventDefault(); navigate('/admin/cluster-catalog'); }}>
            Cluster Catalog
          </BreadcrumbItem>
          <BreadcrumbItem isActive>Create Cluster</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" size="2xl" style={{ marginTop: '1rem' }}>
          Create Cluster from Template: {template.title || template.id}
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

      <PageSection style={{ maxWidth: '800px' }}>
        {error && (
          <Alert variant="danger" title="Error" isInline style={{ marginBottom: '1rem' }}>
            {error}
          </Alert>
        )}

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit}>
              {/* Node Configuration */}
              {template.node_sets && Object.keys(template.node_sets).length > 0 && (
                <FormSection title="Node Configuration">
                  <div style={{ fontSize: '0.8rem', color: 'var(--pf-v6-global--Color--200)', marginTop: '-0.5rem', marginBottom: '0.1rem' }}>
                    The cluster will be deployed with the following worker nodes. Each node provides compute, memory, and storage resources for your workloads.
                  </div>
                  <div>
                    {Object.entries(template.node_sets).map(([key, nodeSet], index) => {
                      const hostClassId = nodeSet.host_class || ''
                      const hostClassInfo = hostClasses[hostClassId]
                      const displayName = hostClassInfo?.name || hostClassId.toUpperCase()

                      return (
                        <div key={key} style={{ marginBottom: index < Object.keys(template.node_sets || {}).length - 1 ? '1rem' : 0 }}>
                          <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 500, color: 'var(--pf-v6-global--Color--100)' }}>
                              Workers: {nodeSet.size || 0}
                            </span>
                            <span style={{ color: 'var(--pf-v6-global--Color--200)' }}>
                              {' '}({displayName})
                            </span>
                          </div>
                          {hostClassInfo && (
                            <div style={{
                              fontSize: '0.8125rem',
                              color: 'var(--pf-v6-global--Color--200)',
                              lineHeight: '1.5',
                              paddingLeft: '1rem',
                              borderLeft: '3px solid var(--pf-v6-global--BorderColor--100)'
                            }}>
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong style={{ color: 'var(--pf-v6-global--Color--100)' }}>CPU:</strong> {hostClassInfo.cpu.type} ({hostClassInfo.cpu.cores} cores, {hostClassInfo.cpu.sockets} sockets)
                              </div>
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong style={{ color: 'var(--pf-v6-global--Color--100)' }}>RAM:</strong> {hostClassInfo.ram.size} {hostClassInfo.ram.type}
                              </div>
                              <div style={{ marginBottom: hostClassInfo.gpu ? '0.25rem' : 0 }}>
                                <strong style={{ color: 'var(--pf-v6-global--Color--100)' }}>Disk:</strong> {hostClassInfo.disk.size} {hostClassInfo.disk.type}
                              </div>
                              {hostClassInfo.gpu && (
                                <div>
                                  <strong style={{ color: 'var(--pf-v6-global--Color--100)' }}>GPU:</strong> {hostClassInfo.gpu.model || 'Available'} {hostClassInfo.gpu.count ? `(${hostClassInfo.gpu.count}x)` : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </FormSection>
              )}

              <Divider />

              {/* Basic Information */}
              <FormSection title="Basic Information" style={{ marginBlockStart: '1rem' }}>
                <FormGroup label="Cluster Name" isRequired fieldId="cluster-name">
                  <TextInput
                    isRequired
                    type="text"
                    id="cluster-name"
                    name="cluster-name"
                    value={clusterName}
                    onChange={(_event, value) => setClusterName(value)}
                    placeholder="my-cluster"
                  />
                </FormGroup>

                <FormGroup label="Tenants" fieldId="tenants">
                  <Select
                    id="tenants"
                    isOpen={isTenantSelectOpen}
                    selected={selectedTenants}
                    onSelect={(_event, selection) => {
                      const selectionString = selection as string
                      if (selectedTenants.includes(selectionString)) {
                        setSelectedTenants(selectedTenants.filter(item => item !== selectionString))
                      } else {
                        setSelectedTenants([...selectedTenants, selectionString])
                      }
                    }}
                    onOpenChange={(isOpen) => setIsTenantSelectOpen(isOpen)}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsTenantSelectOpen(!isTenantSelectOpen)}
                        isExpanded={isTenantSelectOpen}
                        isDisabled={loadingTenants || tenants.length === 0}
                        style={{ width: '100%' }}
                      >
                        {loadingTenants ? (
                          'Loading tenants...'
                        ) : selectedTenants.length === 0 ? (
                          'Select tenants'
                        ) : (
                          `${selectedTenants.length} tenant${selectedTenants.length > 1 ? 's' : ''} selected`
                        )}
                      </MenuToggle>
                    )}
                  >
                    <SelectList>
                      {tenants.map((tenant) => (
                        <SelectOption
                          key={tenant.id}
                          value={tenant.metadata?.name || tenant.id}
                          hasCheckbox
                          isSelected={selectedTenants.includes(tenant.metadata?.name || tenant.id)}
                        >
                          {tenant.metadata?.name || tenant.id}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                  <div style={{ fontSize: '0.8rem', color: 'var(--pf-v6-global--Color--200)', marginTop: '0.5rem' }}>
                    Select one or more tenants to deploy this cluster under. Leave empty to deploy without tenant assignment.
                  </div>
                </FormGroup>
              </FormSection>

              {/* Template Parameters */}
              {template.parameters && template.parameters.filter(param => param.name !== 'pull_secret' && param.name !== 'ssh_public_key').length > 0 && (
                <FormSection title="Template Parameters">
                  {template.parameters
                    .filter(param => param.name !== 'pull_secret' && param.name !== 'ssh_public_key') // Skip pull_secret and ssh_public_key as they're handled separately
                    .map((param) => {
                    const paramValue = parameters[param.name]

                    // Render based on type
                    if (param.type === 'bool') {
                      return (
                        <FormGroup
                          key={param.name}
                          label={
                            <span>
                              {param.title || param.name}
                              {param.description && (
                                <Popover
                                  aria-label={`${param.title || param.name} help`}
                                  bodyContent={
                                    <div>{formatDescriptionText(param.description)}</div>
                                  }
                                >
                                  <Button
                                    variant="plain"
                                    aria-label={`${param.title || param.name} help`}
                                    style={{ padding: '0 0.5rem', verticalAlign: 'baseline' }}
                                  >
                                    <HelpIcon style={{ fontSize: '0.875rem', color: 'var(--pf-v6-global--Color--200)' }} />
                                  </Button>
                                </Popover>
                              )}
                            </span>
                          }
                          fieldId={`param-${param.name}`}
                        >
                          <Checkbox
                            id={`param-${param.name}`}
                            label={param.title || param.name}
                            isChecked={paramValue === true}
                            onChange={(_event, checked) => handleParameterChange(param.name, checked)}
                          />
                        </FormGroup>
                      )
                    } else if (param.type === 'int32') {
                      return (
                        <FormGroup
                          key={param.name}
                          label={
                            <span>
                              {param.title || param.name}
                              {param.description && (
                                <Popover
                                  aria-label={`${param.title || param.name} help`}
                                  bodyContent={
                                    <div>{formatDescriptionText(param.description)}</div>
                                  }
                                >
                                  <Button
                                    variant="plain"
                                    aria-label={`${param.title || param.name} help`}
                                    style={{ padding: '0 0.5rem', verticalAlign: 'baseline' }}
                                  >
                                    <HelpIcon style={{ fontSize: '0.875rem', color: 'var(--pf-v6-global--Color--200)' }} />
                                  </Button>
                                </Popover>
                              )}
                            </span>
                          }
                          isRequired={param.required}
                          fieldId={`param-${param.name}`}
                        >
                          <NumberInput
                            id={`param-${param.name}`}
                            value={Number(paramValue) || 0}
                            onMinus={() => handleParameterChange(param.name, (Number(paramValue) || 0) - 1)}
                            onPlus={() => handleParameterChange(param.name, (Number(paramValue) || 0) + 1)}
                            onChange={(event) => {
                              const value = (event.target as HTMLInputElement).value
                              handleParameterChange(param.name, parseInt(value, 10) || 0)
                            }}
                            min={0}
                          />
                        </FormGroup>
                      )
                    } else {
                      // Default to string
                      return (
                        <FormGroup
                          key={param.name}
                          label={
                            <span>
                              {param.title || param.name}
                              {param.description && (
                                <Popover
                                  aria-label={`${param.title || param.name} help`}
                                  bodyContent={
                                    <div>{formatDescriptionText(param.description)}</div>
                                  }
                                >
                                  <Button
                                    variant="plain"
                                    aria-label={`${param.title || param.name} help`}
                                    style={{ padding: '0 0.5rem', verticalAlign: 'baseline' }}
                                  >
                                    <HelpIcon style={{ fontSize: '0.875rem', color: 'var(--pf-v6-global--Color--200)' }} />
                                  </Button>
                                </Popover>
                              )}
                            </span>
                          }
                          isRequired={param.required}
                          fieldId={`param-${param.name}`}
                        >
                          <TextInput
                            isRequired={param.required}
                            type="text"
                            id={`param-${param.name}`}
                            value={String(paramValue || '')}
                            onChange={(_event, value) => handleParameterChange(param.name, value)}
                          />
                        </FormGroup>
                      )
                    }
                  })}
                </FormSection>
              )}

              {/* Authentication */}
              <FormSection title="Authentication">
                {hasDefaults && !showAdvanced && (
                  <Alert
                    variant="info"
                    isInline
                    title="Using default credentials"
                    style={{ marginBottom: '1rem' }}
                  >
                    Default pull secret and SSH key will be used for cluster authentication.
                    Check "Show advanced options" below to customize these values.
                  </Alert>
                )}

                <FormGroup fieldId="show-advanced">
                  <Checkbox
                    id="show-advanced"
                    label="Show advanced authentication options"
                    isChecked={showAdvanced}
                    onChange={(_event, checked) => {
                      setShowAdvanced(checked)
                      // When showing advanced options, clear the fields for user to input
                      if (checked) {
                        setPullSecret('')
                        setParameters(prev => ({
                          ...prev,
                          ssh_public_key: ''
                        }))
                      } else {
                        // When hiding advanced, restore defaults
                        const defaultPullSecret = localStorage.getItem('default_pull_secret')
                        const defaultSshKey = localStorage.getItem('default_ssh_key')
                        if (defaultPullSecret) setPullSecret(defaultPullSecret)
                        if (defaultSshKey) {
                          setParameters(prev => ({
                            ...prev,
                            ssh_public_key: defaultSshKey
                          }))
                        }
                      }
                    }}
                  />
                </FormGroup>

                {(!hasDefaults || showAdvanced) && (
                  <>
                    <FormGroup
                      label="Pull Secret"
                      isRequired
                      fieldId="pull-secret"
                    >
                      <div style={{ maxWidth: '734px' }}>
                        <TextArea
                          isRequired
                          id="pull-secret"
                          name="pull-secret"
                          value={pullSecret}
                          onChange={(_event, value) => setPullSecret(value)}
                          rows={8}
                          placeholder='{"auths":{"cloud.openshift.com":{"auth":"...","email":"..."}}}'
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--pf-v6-global--Color--200)', marginTop: '0.5rem', maxWidth: '734px' }}>
                        A Red Hat account pull secret can be found in{' '}
                        <a
                          href="https://console.redhat.com/openshift/install/pull-secret"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          OpenShift Cluster Manager{' '}
                          <svg
                            viewBox="0 0 512 512"
                            style={{ width: '0.75em', height: '0.75em', verticalAlign: 'middle', display: 'inline-block' }}
                            fill="currentColor"
                          >
                            <path d="M432,320H400a16,16,0,0,0-16,16V448H64V128H208a16,16,0,0,0,16-16V80a16,16,0,0,0-16-16H48A48,48,0,0,0,0,112V464a48,48,0,0,0,48,48H400a48,48,0,0,0,48-48V336A16,16,0,0,0,432,320ZM488,0h-128c-21.37,0-32.05,25.91-17,41l35.73,35.73L135,320.37a24,24,0,0,0,0,34L157.67,377a24,24,0,0,0,34,0L435.28,133.32,471,169c15,15,41,4.5,41-17V24A24,24,0,0,0,488,0Z" />
                          </svg>
                        </a>
                      </div>
                    </FormGroup>

                    {template.parameters?.find(p => p.name === 'ssh_public_key') && (
                      <FormGroup
                        label="SSH Public Key"
                        fieldId="ssh-public-key"
                      >
                        <div style={{ maxWidth: '734px' }}>
                          <TextArea
                            id="ssh-public-key"
                            name="ssh-public-key"
                            value={String(parameters.ssh_public_key || '')}
                            onChange={(_event, value) => handleParameterChange('ssh_public_key', value)}
                            rows={4}
                            placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--pf-v6-global--Color--200)', marginTop: '0.5rem', maxWidth: '734px' }}>
                          A public ssh key that will be installed into the authorized_keys file of the core user on cluster worker nodes.
                        </div>
                      </FormGroup>
                    )}
                  </>
                )}
              </FormSection>

              {/* Actions */}
              <ActionGroup>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={creating}
                  isDisabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Cluster'}
                </Button>
                <Button
                  variant="link"
                  onClick={() => navigate('/admin/cluster-catalog')}
                  isDisabled={creating}
                >
                  Cancel
                </Button>
              </ActionGroup>
            </Form>
          </CardBody>
        </Card>
      </PageSection>
    </AppLayout>
  )
}

export default ClusterCreate
