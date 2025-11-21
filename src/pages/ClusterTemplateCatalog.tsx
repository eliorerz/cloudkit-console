import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  PageSection,
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
  Title,
  Divider,
  Sidebar,
  SidebarPanel,
  SidebarContent,
  Checkbox,
  Spinner,
} from '@patternfly/react-core'
import { ServerIcon, OpenshiftIcon, CubeIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getClusterTemplates } from '../api/clusterTemplates'
import { ClusterTemplate } from '../api/types'

const getIcon = (iconType?: string) => {
  switch (iconType) {
    case 'openshift':
      return <OpenshiftIcon />
    case 'cube':
      return <CubeIcon />
    case 'server':
    default:
      return <ServerIcon />
  }
}

const ClusterTemplateCatalog: React.FC = () => {
  const navigate = useNavigate()
  const [selectedTemplate, setSelectedTemplate] = useState<ClusterTemplate | null>(null)
  const [templates, setTemplates] = useState<ClusterTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [gpuRequired, setGpuRequired] = useState(false)
  const [armBased, setArmBased] = useState(false)
  const [x86Arch, setX86Arch] = useState(false)
  const [includeAdvanced, setIncludeAdvanced] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true)
        const data = await getClusterTemplates()
        setTemplates(data)
      } catch (error) {
        console.error('Error fetching cluster templates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  // Filtered templates based on filter criteria
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // GPU filter
      if (gpuRequired && !template.hasGPU) {
        return false
      }

      // ARM filter
      if (armBased && template.architecture !== 'ARM') {
        return false
      }

      // x86 filter
      if (x86Arch && template.architecture !== 'x86') {
        return false
      }

      // Advanced templates filter
      if (includeAdvanced && !template.isAdvanced) {
        return false
      }

      // Version filter
      if (selectedVersions.length > 0 && !selectedVersions.includes(template.version || '')) {
        return false
      }

      return true
    })
  }, [templates, gpuRequired, armBased, x86Arch, includeAdvanced, selectedVersions])

  const handleTemplateClick = (template: ClusterTemplate) => {
    setSelectedTemplate(template)
  }

  const handleCloseDrawer = () => {
    setSelectedTemplate(null)
  }

  const handleCreateCluster = () => {
    if (selectedTemplate) {
      navigate(`/admin/clusters/create?template=${selectedTemplate.id}`)
    }
  }

  const handleVersionChange = (version: string, checked: boolean) => {
    if (checked) {
      setSelectedVersions([...selectedVersions, version])
    } else {
      setSelectedVersions(selectedVersions.filter((v) => v !== version))
    }
  }

  const drawerContent = selectedTemplate && (
    <div
      style={{
        width: '550px',
        borderTopLeftRadius: '18px',
        height: '100vh',
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9999,
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #d2d2d2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {getIcon(selectedTemplate.icon)}
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
        <div style={{ marginBottom: '1.5rem' }}>
          <Title headingLevel="h3" size="md" style={{ marginBottom: '0.75rem' }}>
            Overview
          </Title>
          <p style={{ color: 'var(--pf-v6-global--Color--200)', lineHeight: '1.5' }}>
            {selectedTemplate.description}
          </p>
        </div>

        <Divider style={{ margin: '1.5rem 0' }} />

        <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>
          Cluster Configuration
        </Title>

        <DescriptionList isHorizontal isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Total Nodes</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedTemplate.nodeCount} nodes
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Architecture</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedTemplate.architecture}
            </DescriptionListDescription>
          </DescriptionListGroup>

          {selectedTemplate.hasGPU && (
            <DescriptionListGroup>
              <DescriptionListTerm>GPU Enabled</DescriptionListTerm>
              <DescriptionListDescription>
                Yes
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {selectedTemplate.node_sets && Object.entries(selectedTemplate.node_sets).map(([name, nodeSet]) => (
            <DescriptionListGroup key={name}>
              <DescriptionListTerm>Host Class</DescriptionListTerm>
              <DescriptionListDescription>
                {nodeSet.host_class?.toUpperCase() || 'N/A'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>

        <Divider style={{ margin: '1.5rem 0' }} />

        <Title headingLevel="h3" size="md" style={{ marginBottom: '1rem' }}>
          Version Compatibility
        </Title>
        <DescriptionList isHorizontal isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>OpenShift Version</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedTemplate.version}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <Divider style={{ margin: '1.5rem 0' }} />

        <Button variant="primary" isBlock onClick={handleCreateCluster}>
          Create Cluster from Template
        </Button>
      </div>
    </div>
  )

  const filterPanel = (
    <SidebarPanel variant="sticky" style={{ backgroundColor: '#f5f5f5', padding: '1.5rem', minWidth: '280px' }}>
      <Title headingLevel="h3" size="md" style={{ marginBottom: '1.5rem' }}>
        Filters
      </Title>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
          Hardware
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Checkbox
            id="gpu-required"
            label="GPU required"
            isChecked={gpuRequired}
            onChange={(_event, checked) => setGpuRequired(checked)}
          />
          <Checkbox
            id="arm-based"
            label="ARM-based nodes"
            isChecked={armBased}
            onChange={(_event, checked) => setArmBased(checked)}
          />
          <Checkbox
            id="x86-arch"
            label="x86 architecture"
            isChecked={x86Arch}
            onChange={(_event, checked) => setX86Arch(checked)}
          />
        </div>
      </div>

      <Divider style={{ margin: '1rem 0' }} />

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
          Template Type
        </div>
        <Checkbox
          id="advanced-templates"
          label="Include advanced templates"
          isChecked={includeAdvanced}
          onChange={(_event, checked) => setIncludeAdvanced(checked)}
        />
      </div>

      <Divider style={{ margin: '1rem 0' }} />

      <div>
        <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
          Version
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Checkbox
            id="version-4-20"
            label="4.20"
            isChecked={selectedVersions.includes('4.20')}
            onChange={(_event, checked) => handleVersionChange('4.20', checked)}
          />
          <Checkbox
            id="version-4-19"
            label="4.19"
            isChecked={selectedVersions.includes('4.19')}
            onChange={(_event, checked) => handleVersionChange('4.19', checked)}
          />
          <Checkbox
            id="version-4-17"
            label="4.17"
            isChecked={selectedVersions.includes('4.17')}
            onChange={(_event, checked) => handleVersionChange('4.17', checked)}
          />
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
                Cluster Templates
              </Title>
              <p style={{ color: 'var(--pf-v6-global--Color--200)' }}>
                Select a pre-configured cluster template to deploy
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Spinner size="xl" />
                <p style={{ marginTop: '1rem', color: 'var(--pf-v6-global--Color--200)' }}>
                  Loading cluster templates...
                </p>
              </div>
            ) : (
              <>
                <Grid hasGutter span={12}>
                  {filteredTemplates.map((template) => (
              <GridItem key={template.id} span={12} sm={6} lg={4}>
                <Card
                  isSelectable
                  isSelected={selectedTemplate?.id === template.id}
                  onClick={() => handleTemplateClick(template)}
                  style={{
                    cursor: 'pointer',
                    height: '100%',
                    backgroundColor: '#ffffff',
                    border: selectedTemplate?.id === template.id
                      ? '2px solid var(--pf-v6-global--primary-color--100)'
                      : '1px solid #d2d2d2',
                  }}
                >
                  <CardTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      {getIcon(template.icon)}
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>{template.title}</span>
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
                        {template.description}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6a6e73', marginBottom: '0.5rem' }}>
                        Configuration
                      </div>
                      <ul style={{
                        margin: 0,
                        paddingLeft: '1.25rem',
                        fontSize: '0.875rem',
                        color: 'var(--pf-v6-global--Color--200)',
                        lineHeight: '1.6',
                      }}>
                        <li>{template.nodeCount} nodes</li>
                        <li>{template.architecture} architecture</li>
                        <li>OpenShift {template.version}</li>
                        {template.hasGPU && <li>GPU enabled</li>}
                      </ul>
                    </div>
                  </CardBody>
                  <CardFooter>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {template.tags?.map((tag) => (
                        <Label key={tag} color={tag === 'AI/ML' ? 'purple' : 'blue'} isCompact>
                          {tag}
                        </Label>
                      ))}
                      {template.hasGPU && (
                        <Label color="orange" isCompact>
                          GPU
                        </Label>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              </GridItem>
                  ))}
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
                    No templates found matching your filters
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

export default ClusterTemplateCatalog
