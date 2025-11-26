import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PageSection,
  Title,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Gallery,
  GalleryItem,
  Flex,
  FlexItem,
  Tabs,
  Tab,
  TabTitleText,
  List,
  ListItem,
  Label,
} from '@patternfly/react-core'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'

const Monitoring: React.FC = () => {
  const { t } = useTranslation(['monitoring', 'common'])
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0)

  // Mock data - in real implementation, fetch from API
  const [metrics] = useState({
    clusters: {
      total: 12,
      healthy: 9,
      warning: 2,
      critical: 1,
    },
    resources: {
      cpu: { used: 67, total: 100 },
      memory: { used: 142, total: 256 },
      storage: { used: 1.8, total: 5.0 },
      gpu: { used: 12, total: 16 },
    },
    utilization: [
      { time: '00:00', cpu: 45, memory: 52, storage: 36, gpu: 42 },
      { time: '04:00', cpu: 38, memory: 48, storage: 36, gpu: 35 },
      { time: '08:00', cpu: 62, memory: 58, storage: 37, gpu: 58 },
      { time: '12:00', cpu: 78, memory: 68, storage: 38, gpu: 72 },
      { time: '16:00', cpu: 85, memory: 72, storage: 39, gpu: 85 },
      { time: '20:00', cpu: 67, memory: 62, storage: 38, gpu: 68 },
      { time: 'Now', cpu: 67, memory: 55, storage: 36, gpu: 75 },
    ],
    events: [
      { time: '2 minutes ago', type: 'success', message: 'Cluster ocp-prod-01 scaled successfully', cluster: 'ocp-prod-01' },
      { time: '15 minutes ago', type: 'warning', message: 'High memory usage detected on ocp-dev-03', cluster: 'ocp-dev-03' },
      { time: '1 hour ago', type: 'info', message: 'Cluster ocp-staging-02 updated to version 4.17.1', cluster: 'ocp-staging-02' },
      { time: '2 hours ago', type: 'error', message: 'Node failure in cluster ocp-prod-02', cluster: 'ocp-prod-02' },
      { time: '3 hours ago', type: 'success', message: 'Backup completed for all clusters', cluster: 'All' },
      { time: '5 hours ago', type: 'info', message: 'Maintenance window started for ocp-dev-01', cluster: 'ocp-dev-01' },
    ],
  })

  // Simple line chart component
  const LineChart: React.FC<{
    data: Array<{ time: string; cpu: number; memory: number; storage: number; gpu: number }>
    metric: 'cpu' | 'memory' | 'storage' | 'gpu'
    color: string
    label: string
  }> = ({ data, metric, color, label }) => {
    const maxValue = 100
    const height = 120
    const width = 300
    const padding = 20

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((d[metric] / maxValue) * (height - 2 * padding)) - padding
      return `${x},${y}`
    }).join(' ')

    return (
      <div style={{ width: '100%', overflow: 'auto' }}>
        <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d2d2d2" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d2d2d2" strokeWidth="1" />

          {/* Y-axis labels */}
          <text x="5" y={padding} fontSize="10" fill="#6a6e73">100{t('monitoring:resources.utilized')}</text>
          <text x="5" y={height / 2} fontSize="10" fill="#6a6e73">50{t('monitoring:resources.utilized')}</text>
          <text x="10" y={height - padding + 5} fontSize="10" fill="#6a6e73">0{t('monitoring:resources.utilized')}</text>

          {/* Chart line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * (width - 2 * padding) + padding
            const y = height - ((d[metric] / maxValue) * (height - 2 * padding)) - padding
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={color}
              />
            )
          })}

          {/* X-axis labels */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * (width - 2 * padding) + padding
            return (
              <text
                key={i}
                x={x}
                y={height - 5}
                fontSize="9"
                fill="#6a6e73"
                textAnchor="middle"
              >
                {d.time}
              </text>
            )
          })}
        </svg>
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
          {label}
        </div>
      </div>
    )
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon style={{ color: '#3e8635' }} />
      case 'warning':
        return <ExclamationTriangleIcon style={{ color: '#f0ab00' }} />
      case 'error':
        return <ExclamationCircleIcon style={{ color: '#c9190b' }} />
      default:
        return <ClockIcon style={{ color: '#06c' }} />
    }
  }

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="2xl" style={{ marginBottom: '1.5rem' }}>
          {t('monitoring:title')}
        </Title>

        <Tabs
          activeKey={activeTabKey}
          onSelect={(_, tabIndex) => setActiveTabKey(tabIndex)}
          aria-label="Monitoring tabs"
          style={{ marginBottom: '1.5rem' }}
        >
          <Tab eventKey={0} title={<TabTitleText>{t('monitoring:tabs.overview')}</TabTitleText>} />
          <Tab eventKey={1} title={<TabTitleText>{t('monitoring:tabs.clusters')}</TabTitleText>} />
          <Tab eventKey={2} title={<TabTitleText>{t('monitoring:tabs.resources')}</TabTitleText>} />
          <Tab eventKey={3} title={<TabTitleText>{t('monitoring:tabs.events')}</TabTitleText>} />
        </Tabs>

        {activeTabKey === 0 && (
          <>
            {/* Metrics Summary */}
            <Gallery hasGutter minWidths={{ default: '100%', sm: '100%', md: '240px', lg: '280px' }} style={{ marginBottom: '1.5rem' }}>
              <GalleryItem>
                <Card isFullHeight>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        <CheckCircleIcon style={{ fontSize: '1.5rem', color: '#3e8635' }} />
                      </FlexItem>
                      <FlexItem>{t('monitoring:metrics.healthyClusters.title')}</FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3e8635' }}>
                      {metrics.clusters.healthy}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                      {t('monitoring:metrics.healthyClusters.description', { total: metrics.clusters.total })}
                    </div>
                  </CardBody>
                </Card>
              </GalleryItem>

              <GalleryItem>
                <Card isFullHeight>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        <ExclamationTriangleIcon style={{ fontSize: '1.5rem', color: '#f0ab00' }} />
                      </FlexItem>
                      <FlexItem>{t('monitoring:metrics.warnings.title')}</FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f0ab00' }}>
                      {metrics.clusters.warning}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                      {t('monitoring:metrics.warnings.description')}
                    </div>
                  </CardBody>
                </Card>
              </GalleryItem>

              <GalleryItem>
                <Card isFullHeight>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        <ExclamationCircleIcon style={{ fontSize: '1.5rem', color: '#c9190b' }} />
                      </FlexItem>
                      <FlexItem>{t('monitoring:metrics.criticalIssues.title')}</FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#c9190b' }}>
                      {metrics.clusters.critical}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                      {t('monitoring:metrics.criticalIssues.description')}
                    </div>
                  </CardBody>
                </Card>
              </GalleryItem>
            </Gallery>

            {/* Resource Utilization Charts */}
            <Grid hasGutter>
              <GridItem span={12}>
                <Card>
                  <CardTitle>{t('monitoring:charts.title')}</CardTitle>
                  <CardBody>
                    <Grid hasGutter>
                      <GridItem sm={12} md={6} lg={3}>
                        <LineChart
                          data={metrics.utilization}
                          metric="cpu"
                          color="#06c"
                          label={t('monitoring:charts.cpuUsage')}
                        />
                      </GridItem>
                      <GridItem sm={12} md={6} lg={3}>
                        <LineChart
                          data={metrics.utilization}
                          metric="memory"
                          color="#8476d1"
                          label={t('monitoring:charts.memoryUsage')}
                        />
                      </GridItem>
                      <GridItem sm={12} md={6} lg={3}>
                        <LineChart
                          data={metrics.utilization}
                          metric="gpu"
                          color="#3e8635"
                          label={t('monitoring:charts.gpuUsage')}
                        />
                      </GridItem>
                      <GridItem sm={12} md={6} lg={3}>
                        <LineChart
                          data={metrics.utilization}
                          metric="storage"
                          color="#f0ab00"
                          label={t('monitoring:charts.storageUsage')}
                        />
                      </GridItem>
                    </Grid>
                  </CardBody>
                </Card>
              </GridItem>

              {/* Recent Events */}
              <GridItem sm={12} md={6}>
                <Card style={{ height: '100%' }}>
                  <CardTitle>{t('monitoring:events.title')}</CardTitle>
                  <CardBody style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <List isPlain>
                      {metrics.events.map((event, index) => (
                        <ListItem key={index} style={{ paddingBottom: '1rem', borderBottom: index < metrics.events.length - 1 ? '1px solid #d2d2d2' : 'none' }}>
                          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                            <FlexItem>{getEventIcon(event.type)}</FlexItem>
                            <FlexItem flex={{ default: 'flex_1' }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                {event.message}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                                {event.cluster} • {event.time}
                              </div>
                            </FlexItem>
                            <FlexItem>
                              <Label
                                color={event.type === 'success' ? 'green' : event.type === 'warning' ? 'orange' : event.type === 'error' ? 'red' : 'blue'}
                              >
                                {t(`monitoring:events.types.${event.type}`)}
                              </Label>
                            </FlexItem>
                          </Flex>
                        </ListItem>
                      ))}
                    </List>
                  </CardBody>
                </Card>
              </GridItem>

              {/* Current Resource Usage */}
              <GridItem sm={12} md={6}>
                <Card style={{ height: '100%' }}>
                  <CardTitle>{t('monitoring:resources.title')}</CardTitle>
                  <CardBody>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} style={{ marginBottom: '0.5rem' }}>
                        <FlexItem>
                          <span style={{ fontWeight: 600 }}>{t('monitoring:resources.cpu')}</span>
                        </FlexItem>
                        <FlexItem>
                          <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                            {metrics.resources.cpu.used} / {metrics.resources.cpu.total} {t('monitoring:resources.cores')}
                          </span>
                        </FlexItem>
                      </Flex>
                      <div style={{ width: '100%', height: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(metrics.resources.cpu.used / metrics.resources.cpu.total) * 100}%`,
                            height: '100%',
                            backgroundColor: '#06c',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                        {Math.round((metrics.resources.cpu.used / metrics.resources.cpu.total) * 100)}{t('monitoring:resources.utilized')}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} style={{ marginBottom: '0.5rem' }}>
                        <FlexItem>
                          <span style={{ fontWeight: 600 }}>{t('monitoring:resources.memory')}</span>
                        </FlexItem>
                        <FlexItem>
                          <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                            {metrics.resources.memory.used} / {metrics.resources.memory.total} {t('monitoring:resources.gb')}
                          </span>
                        </FlexItem>
                      </Flex>
                      <div style={{ width: '100%', height: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(metrics.resources.memory.used / metrics.resources.memory.total) * 100}%`,
                            height: '100%',
                            backgroundColor: '#06c',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                        {Math.round((metrics.resources.memory.used / metrics.resources.memory.total) * 100)}{t('monitoring:resources.utilized')}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} style={{ marginBottom: '0.5rem' }}>
                        <FlexItem>
                          <span style={{ fontWeight: 600 }}>{t('monitoring:resources.gpu')}</span>
                        </FlexItem>
                        <FlexItem>
                          <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                            {metrics.resources.gpu.used} / {metrics.resources.gpu.total} {t('monitoring:resources.gpus')}
                          </span>
                        </FlexItem>
                      </Flex>
                      <div style={{ width: '100%', height: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(metrics.resources.gpu.used / metrics.resources.gpu.total) * 100}%`,
                            height: '100%',
                            backgroundColor: '#3e8635',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                        {Math.round((metrics.resources.gpu.used / metrics.resources.gpu.total) * 100)}{t('monitoring:resources.utilized')}
                      </div>
                    </div>

                    <div>
                      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} style={{ marginBottom: '0.5rem' }}>
                        <FlexItem>
                          <span style={{ fontWeight: 600 }}>{t('monitoring:resources.storage')}</span>
                        </FlexItem>
                        <FlexItem>
                          <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                            {metrics.resources.storage.used} / {metrics.resources.storage.total} {t('monitoring:resources.tb')}
                          </span>
                        </FlexItem>
                      </Flex>
                      <div style={{ width: '100%', height: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(metrics.resources.storage.used / metrics.resources.storage.total) * 100}%`,
                            height: '100%',
                            backgroundColor: '#f0ab00',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginTop: '0.25rem' }}>
                        {Math.round((metrics.resources.storage.used / metrics.resources.storage.total) * 100)}{t('monitoring:resources.utilized')}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </>
        )}

        {activeTabKey === 1 && (
          <Card>
            <CardBody>
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6a6e73' }}>
                {t('monitoring:placeholders.clusterMonitoring')}
              </div>
            </CardBody>
          </Card>
        )}

        {activeTabKey === 2 && (
          <Card>
            <CardBody>
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6a6e73' }}>
                {t('monitoring:placeholders.resourceDetails')}
              </div>
            </CardBody>
          </Card>
        )}

        {activeTabKey === 3 && (
          <Card>
            <CardBody>
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6a6e73' }}>
                {t('monitoring:placeholders.eventLog')}
              </div>
            </CardBody>
          </Card>
        )}
      </PageSection>
    </AppLayout>
  )
}

export default Monitoring
