import { useState, useEffect } from 'react'
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
} from '@patternfly/react-core'
import { HelpIcon, ExternalLinkAltIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { listClusterTemplates, createCluster } from '../api/clustersApi'
import { ClusterTemplate } from '../api/types'

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
  const [parameters, setParameters] = useState<Record<string, any>>({})

  useEffect(() => {
    loadTemplate()
    loadHostClasses()
  }, [templateId])

  const loadHostClasses = async () => {
    try {
      const response = await fetch('/api/host-classes')
      const data = await response.json()
      setHostClasses(data)
    } catch (err) {
      console.error('Failed to load host classes:', err)
      // Non-critical, just log the error
    }
  }

  const loadTemplate = async () => {
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
      const initialParams: Record<string, any> = {}
      if (foundTemplate.parameters) {
        foundTemplate.parameters.forEach(param => {
          if (param.default !== undefined) {
            initialParams[param.name] = param.default
          }
        })
      }
      setParameters(initialParams)
    } catch (err: any) {
      console.error('Failed to load template:', err)
      setError(err.message || 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value,
    }))
  }

  // Helper function to wrap parameter values in google.protobuf.Any format
  const wrapParameterValue = (type: string, value: any) => {
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
      const wrappedParameters: Record<string, any> = {}
      if (template.parameters) {
        template.parameters.forEach(param => {
          const value = param.name === 'pull_secret' ? pullSecret : parameters[param.name]
          if (value !== undefined && value !== '') {
            const wrapped = wrapParameterValue(param.type || 'string', value)
            console.log(`Wrapping parameter ${param.name} (type: ${param.type}):`, { value, wrapped })
            wrappedParameters[param.name] = wrapped
          }
        })
      }

      console.log('Wrapped parameters:', wrappedParameters)

      // Build cluster spec
      const clusterSpec = {
        metadata: {
          name: clusterName,
        },
        spec: {
          template: template.id,
          template_parameters: wrappedParameters,
        },
      }

      console.log('Cluster spec:', JSON.stringify(clusterSpec, null, 2))

      const newCluster = await createCluster(clusterSpec)

      // Redirect to cluster detail page
      navigate(`/admin/clusters/${newCluster.id}`)
    } catch (err: any) {
      console.error('Failed to create cluster:', err)
      setError(err.message || 'Failed to create cluster')
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
          <Button variant="primary" onClick={() => navigate('/admin/cluster-templates')} style={{ marginTop: '1rem' }}>
            Back to Templates
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
          <Button variant="primary" onClick={() => navigate('/admin/cluster-templates')} style={{ marginTop: '1rem' }}>
            Back to Templates
          </Button>
        </PageSection>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem to="/admin/cluster-templates" onClick={(e) => { e.preventDefault(); navigate('/admin/cluster-templates'); }}>
            Cluster Templates
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

      <PageSection>
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
              <FormSection title="Basic Information">
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
              </FormSection>

              {/* Template Parameters */}
              {template.parameters && template.parameters.length > 0 && (
                <FormSection title="Template Parameters">
                  {template.parameters
                    .filter(param => param.name !== 'pull_secret') // Skip pull_secret as it's handled separately
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
                                    <div dangerouslySetInnerHTML={{
                                      __html: param.description.replace(/`([^`]+)`/g, '<code style="background-color: var(--pf-v6-global--BackgroundColor--200); padding: 0.125rem 0.25rem; border-radius: 3px; font-family: monospace; font-size: 0.875em;">$1</code>')
                                    }} />
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
                                    <div dangerouslySetInnerHTML={{
                                      __html: param.description.replace(/`([^`]+)`/g, '<code style="background-color: var(--pf-v6-global--BackgroundColor--200); padding: 0.125rem 0.25rem; border-radius: 3px; font-family: monospace; font-size: 0.875em;">$1</code>')
                                    }} />
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
                            value={paramValue || 0}
                            onMinus={() => handleParameterChange(param.name, (paramValue || 0) - 1)}
                            onPlus={() => handleParameterChange(param.name, (paramValue || 0) + 1)}
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
                                    <div dangerouslySetInnerHTML={{
                                      __html: param.description.replace(/`([^`]+)`/g, '<code style="background-color: var(--pf-v6-global--BackgroundColor--200); padding: 0.125rem 0.25rem; border-radius: 3px; font-family: monospace; font-size: 0.875em;">$1</code>')
                                    }} />
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
                            value={paramValue || ''}
                            onChange={(_event, value) => handleParameterChange(param.name, value)}
                          />
                        </FormGroup>
                      )
                    }
                  })}
                </FormSection>
              )}

              {/* Pull Secret */}
              <FormSection title="Authentication">
                <FormGroup
                  label="Pull Secret"
                  isRequired
                  fieldId="pull-secret"
                >
                  <TextArea
                    isRequired
                    id="pull-secret"
                    name="pull-secret"
                    value={pullSecret}
                    onChange={(_event, value) => setPullSecret(value)}
                    rows={8}
                    placeholder='{"auths":{"cloud.openshift.com":{"auth":"...","email":"..."}}}'
                  />
                  <div style={{ fontSize: '0.8rem', color: 'var(--pf-v6-global--Color--200)', marginTop: '0.5rem' }}>
                    A Red Hat account pull secret can be found in{' '}
                    <a
                      href="https://console.redhat.com/openshift/install/pull-secret"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      OpenShift Cluster Manager <ExternalLinkAltIcon style={{ verticalAlign: 'middle' }} />
                    </a>
                  </div>
                </FormGroup>
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
                  onClick={() => navigate('/admin/cluster-templates')}
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
