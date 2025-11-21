import { useEffect, useState } from 'react'
import {
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  CardFooter,
  Button,
  Gallery,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Alert,
  ExpandableSection,
} from '@patternfly/react-core'
import { CubesIcon } from '@patternfly/react-icons'
import ReactMarkdown from 'react-markdown'
import AppLayout from '../components/layouts/AppLayout'
import { listClusterTemplates } from '../api/clustersApi'
import { ClusterTemplate } from '../api/types'
import { useNavigate } from 'react-router-dom'

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

const ClusterTemplates: React.FC = () => {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<ClusterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const [hostClasses, setHostClasses] = useState<Record<string, HostClassInfo>>({})

  useEffect(() => {
    loadTemplates()
    loadHostClasses()
  }, [])

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

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await listClusterTemplates()
      setTemplates(response.items || [])
    } catch (err: any) {
      console.error('Failed to load cluster templates:', err)
      setError(err.message || 'Failed to load cluster templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCluster = (template: ClusterTemplate) => {
    navigate(`/admin/clusters/create?template=${template.id}`)
  }

  const toggleDescription = (templateId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(templateId)) {
        newSet.delete(templateId)
      } else {
        newSet.add(templateId)
      }
      return newSet
    })
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

  if (error) {
    return (
      <AppLayout>
        <PageSection>
          <Alert variant="danger" title="Error loading templates">
            {error}
          </Alert>
        </PageSection>
      </AppLayout>
    )
  }

  if (templates.length === 0) {
    return (
      <AppLayout>
        <PageSection>
          <EmptyState>
            <CubesIcon style={{ fontSize: '48px', marginBottom: '1rem' }} />
            <Title headingLevel="h1" size="lg">
              No cluster templates available
            </Title>
            <EmptyStateBody>
              There are no cluster templates available at this time.
              Contact your administrator to create templates.
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          Cluster Templates
        </Title>
        <p style={{ marginTop: '0.5rem', color: 'var(--pf-v6-global--Color--200)' }}>
          Select a template to provision an OpenShift cluster on bare-metal infrastructure
        </p>
      </PageSection>

      <PageSection>
        <Gallery hasGutter minWidths={{ default: '100%', md: '350px', lg: '400px' }} maxWidths={{ md: '1fr', lg: '1fr' }}>
          {templates.map((template) => {
            const isExpanded = expandedDescriptions.has(template.id)
            const description = template.description || 'No description available'
            const shortDescription = description.length > 200 ? description.substring(0, 200) + '...' : description

            return (
              <Card key={template.id} isSelectable isClickable>
                <CardTitle>
                  {template.title || template.id}
                </CardTitle>
                <CardBody style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                  {/* Main content area - takes up available space */}
                  <div style={{ flex: 1 }}>
                    {/* Description with expand/collapse */}
                    <div style={{ marginBottom: '1rem' }}>
                      <ReactMarkdown>
                        {isExpanded ? description : shortDescription}
                      </ReactMarkdown>
                      {description.length > 200 && (
                        <Button
                          variant="link"
                          isInline
                          onClick={() => toggleDescription(template.id)}
                          style={{ padding: 0, marginTop: '0.5rem' }}
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </Button>
                      )}
                    </div>

                    {/* Node Sets */}
                    {template.node_sets && Object.keys(template.node_sets).length > 0 && (
                      <div>
                        <strong>Node Configuration:</strong>
                        <div style={{ marginTop: '0.5rem' }}>
                          {Object.entries(template.node_sets).map(([key, nodeSet]) => {
                            const hostClassId = nodeSet.host_class || ''
                            const hostClassInfo = hostClasses[hostClassId]
                            const displayName = hostClassInfo?.name || hostClassId

                            return (
                              <div key={key} style={{ marginBottom: '1rem' }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                  {nodeSet.size}x {displayName}
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
                                      <strong style={{ color: 'var(--pf-v6-global--Color--100)' }}>CPU:</strong> {hostClassInfo.cpu.type} ({hostClassInfo.cpu.cores} cores)
                                    </div>
                                    <div style={{ marginBottom: '0.25rem' }}>
                                      <strong style={{ color: 'var(--pf-v6-global--Color--100)' }}>RAM:</strong> {hostClassInfo.ram.size} {hostClassInfo.ram.type}
                                    </div>
                                    <div style={{ marginBottom: hostClassInfo.gpu ? '0.25rem' : 0 }}>
                                      <strong style={{ color: 'var(--pf-v6-global--Color--100)' }}>Disk:</strong> {hostClassInfo.disk.size} {hostClassInfo.disk.type}
                                    </div>
                                    {hostClassInfo.gpu && (
                                      <div>
                                        <strong style={{ color: 'var(--pf-v6-global--Color--100)' }}>GPU:</strong> {hostClassInfo.gpu.model || 'Available'}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Parameters summary - always at bottom */}
                  {template.parameters && template.parameters.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <ExpandableSection
                        toggleText={`Parameters (${template.parameters.length})`}
                        isIndented
                      >
                        <ul>
                          {template.parameters.map((param) => (
                            <li key={param.name}>
                              <strong>{param.title || param.name}</strong>
                              {param.required && <span style={{ color: 'var(--pf-v6-global--danger-color--100)' }}> *</span>}
                              {param.description && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--pf-v6-global--Color--200)' }}>
                                  {param.description}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </ExpandableSection>
                    </div>
                  )}
                </CardBody>
                <CardFooter>
                  <Button
                    variant="primary"
                    onClick={() => handleCreateCluster(template)}
                  >
                    Create Cluster
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </Gallery>
      </PageSection>
    </AppLayout>
  )
}

export default ClusterTemplates
