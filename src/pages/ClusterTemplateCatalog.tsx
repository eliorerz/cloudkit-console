import React, { useState, useMemo, useEffect } from 'react'
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
  SearchInput,
} from '@patternfly/react-core'
import { ServerIcon, OpenshiftIcon, CubeIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import AppLayout from '../components/layouts/AppLayout'
import { getClusterTemplates } from '../api/clusterTemplates'
import { ClusterTemplate } from '../api/types'
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
  const { t } = useTranslation(['clusters'])
  const [selectedTemplate, setSelectedTemplate] = useState<ClusterTemplate | null>(null)
  const [templates, setTemplates] = useState<ClusterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [hostClasses, setHostClasses] = useState<Record<string, HostClassInfo>>({})

  // Filter states
  const [searchValue, setSearchValue] = useState('')
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
        logger.error('Error fetching cluster templates', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  // Fetch host classes
  useEffect(() => {
    const fetchHostClasses = async () => {
      try {
        const response = await fetch('/api/host-classes')
        const data = await response.json()
        setHostClasses(data)
      } catch (error) {
        logger.error('Error fetching host classes', error)
      }
    }

    fetchHostClasses()
  }, [])

  // Filtered templates based on filter criteria
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Search filter
      if (searchValue) {
        const searchLower = searchValue.toLowerCase()
        const titleMatch = template.title?.toLowerCase().includes(searchLower)
        const descriptionMatch = template.description?.toLowerCase().includes(searchLower)
        const idMatch = template.id?.toLowerCase().includes(searchLower)
        const tagsMatch = template.tags?.some(tag => tag.toLowerCase().includes(searchLower))

        if (!titleMatch && !descriptionMatch && !idMatch && !tagsMatch) {
          return false
        }
      }

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
  }, [templates, searchValue, gpuRequired, armBased, x86Arch, includeAdvanced, selectedVersions])

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
        width: '650px',
        height: 'calc(100vh - 72px)',
        position: 'fixed',
        right: 0,
        top: '72px',
        bottom: 0,
        zIndex: 9999,
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        borderTopLeftRadius: '18px'
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

        <Title headingLevel="h3" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem' }}>
          Cluster Configuration
        </Title>

        <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
          <DescriptionListGroup>
            <DescriptionListTerm>Total Workers</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedTemplate.nodeCount}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>OpenShift Version</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedTemplate.version}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        {selectedTemplate.node_sets && Object.entries(selectedTemplate.node_sets).map(([name, nodeSet]) => {
          const hostClassId = nodeSet.host_class || ''
          const hostClassInfo = hostClasses[hostClassId]

          return (
            <div key={name}>
              <Divider style={{ margin: '1.5rem 0' }} />
              <Title headingLevel="h3" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem' }}>
                Worker Nodes ({nodeSet.size || 0})
              </Title>

              {hostClassInfo ? (
                <>
                  <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Host Class</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.name} ({hostClassInfo.description})
                      </DescriptionListDescription>
                    </DescriptionListGroup>

                    <DescriptionListGroup>
                      <DescriptionListTerm>Category</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.category}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </>
              ) : (
                <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Host Class</DescriptionListTerm>
                    <DescriptionListDescription>
                      {hostClassId}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              )}

              {hostClassInfo ? (
                <>
                  <Title headingLevel="h4" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem', fontWeight: 700, color: 'var(--pf-v6-global--Color--100)' }}>
                    CPU
                  </Title>
                  <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Type</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.cpu.type}
                      </DescriptionListDescription>
                    </DescriptionListGroup>

                    <DescriptionListGroup>
                      <DescriptionListTerm>Cores</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.cpu.cores} ({hostClassInfo.cpu.sockets} sockets × {hostClassInfo.cpu.threadsPerCore} threads/core)
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>

                  <Title headingLevel="h4" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem', fontWeight: 700, color: 'var(--pf-v6-global--Color--100)' }}>
                    Memory
                  </Title>
                  <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Total RAM</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.ram.size} {hostClassInfo.ram.type}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>

                  <Title headingLevel="h4" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem', fontWeight: 700, color: 'var(--pf-v6-global--Color--100)' }}>
                    Storage
                  </Title>
                  <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Disk</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.disk.size} {hostClassInfo.disk.type} ({hostClassInfo.disk.interface})
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </>
              ) : null}

              {hostClassInfo?.gpu && (
                <>
                  <Title headingLevel="h4" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem', fontWeight: 700, color: 'var(--pf-v6-global--Color--100)' }}>
                    GPU
                  </Title>
                  <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Model</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.gpu.model}
                      </DescriptionListDescription>
                    </DescriptionListGroup>

                    <DescriptionListGroup>
                      <DescriptionListTerm>Count</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.gpu.count}x GPUs
                      </DescriptionListDescription>
                    </DescriptionListGroup>

                    <DescriptionListGroup>
                      <DescriptionListTerm>Memory per GPU</DescriptionListTerm>
                      <DescriptionListDescription>
                        {hostClassInfo.gpu.memory}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </>
              )}

              {!hostClassInfo && selectedTemplate.metadata?.gpu_type && (
                <>
                  <Title headingLevel="h4" size="md" style={{ marginTop: '1.5rem', marginBottom: '0.8rem', fontWeight: 700, color: 'var(--pf-v6-global--Color--100)' }}>
                    GPU
                  </Title>
                  <DescriptionList isHorizontal isCompact style={{ '--pf-v6-c-description-list--RowGap': '0.5rem' } as React.CSSProperties}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Model</DescriptionListTerm>
                      <DescriptionListDescription>
                        NVIDIA {selectedTemplate.metadata.gpu_type}
                      </DescriptionListDescription>
                    </DescriptionListGroup>

                    <DescriptionListGroup>
                      <DescriptionListTerm>Count</DescriptionListTerm>
                      <DescriptionListDescription>
                        {selectedTemplate.metadata.gpu_count}x GPUs
                      </DescriptionListDescription>
                    </DescriptionListGroup>

                    <DescriptionListGroup>
                      <DescriptionListTerm>Memory per GPU</DescriptionListTerm>
                      <DescriptionListDescription>
                        {selectedTemplate.metadata.memory_gb}GB
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </>
              )}
            </div>
          )
        })}

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
        {t('clusters:catalog.filters.title')}
      </Title>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
          {t('clusters:catalog.filters.hardware')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Checkbox
            id="gpu-required"
            label={t('clusters:catalog.filters.gpuRequired')}
            isChecked={gpuRequired}
            onChange={(_event, checked) => setGpuRequired(checked)}
          />
          <Checkbox
            id="arm-based"
            label={t('clusters:catalog.filters.armBased')}
            isChecked={armBased}
            onChange={(_event, checked) => setArmBased(checked)}
          />
          <Checkbox
            id="x86-arch"
            label={t('clusters:catalog.filters.x86')}
            isChecked={x86Arch}
            onChange={(_event, checked) => setX86Arch(checked)}
          />
        </div>
      </div>

      <Divider style={{ margin: '1rem 0' }} />

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
          {t('clusters:catalog.filters.templateType')}
        </div>
        <Checkbox
          id="advanced-templates"
          label={t('clusters:catalog.filters.includeAdvanced')}
          isChecked={includeAdvanced}
          onChange={(_event, checked) => setIncludeAdvanced(checked)}
        />
      </div>

      <Divider style={{ margin: '1rem 0' }} />

      <div>
        <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
          {t('clusters:catalog.filters.version')}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <Title headingLevel="h1" size="2xl" style={{ marginBottom: '0.5rem' }}>
                    {t('clusters:catalog.title')}
                  </Title>
                  <p style={{ color: 'var(--pf-v6-global--Color--200)' }}>
                    {t('clusters:catalog.subtitle')}
                  </p>
                </div>
                <Button variant="primary" onClick={() => navigate('/admin/cluster-catalog/create')}>
                  {t('clusters:catalog.createTemplate')}
                </Button>
              </div>
              <SearchInput
                placeholder={t('clusters:catalog.searchPlaceholder')}
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                style={{ maxWidth: '600px' }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Spinner size="xl" />
                <p style={{ marginTop: '1rem', color: 'var(--pf-v6-global--Color--200)' }}>
                  {t('clusters:catalog.loading')}
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
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#000000', marginBottom: '0.5rem' }}>
                        {t('clusters:catalog.configuration.title')}
                      </div>
                      <ul style={{
                        margin: 0,
                        paddingLeft: 0,
                        listStyle: 'none',
                        fontSize: '0.75rem',
                        color: 'var(--pf-v6-global--Color--200)',
                        lineHeight: '1.6',
                      }}>
                        <li><strong>{t('clusters:catalog.configuration.nodes')}:</strong> {template.nodeCount}</li>
                        {template.node_sets && Object.values(template.node_sets).map((nodeSet, idx) => {
                          const hostClassId = nodeSet.host_class || ''
                          const hostClassInfo = hostClasses[hostClassId]
                          if (!hostClassInfo) return null
                          return (
                            <React.Fragment key={idx}>
                              <li><strong>{t('clusters:catalog.configuration.cpu')}:</strong> {hostClassInfo.cpu.type}</li>
                              <li><strong>{t('clusters:catalog.configuration.memory')}:</strong> {hostClassInfo.ram.size}{hostClassInfo.ram.type ? ` - ${hostClassInfo.ram.type}` : ''}</li>
                              <li><strong>{t('clusters:catalog.configuration.disk')}:</strong> {hostClassInfo.disk.size} - {hostClassInfo.disk.type}</li>
                              {hostClassInfo.gpu && (
                                <li><strong>{t('clusters:catalog.configuration.gpu')}:</strong> {hostClassInfo.gpu.model} {hostClassInfo.gpu.memory} x {hostClassInfo.gpu.count}</li>
                              )}
                            </React.Fragment>
                          )
                        }).filter(Boolean)[0]}
                        <li><strong>{t('clusters:catalog.configuration.openshift')}:</strong> {template.version}</li>
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
