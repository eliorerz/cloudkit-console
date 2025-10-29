import {
  Page,
  PageSection,
  Title,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Card,
  CardBody,
  CardTitle,
  Gallery,
  GalleryItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core'
import { CubeIcon, LayerGroupIcon, NetworkIcon, VirtualMachineIcon } from '@patternfly/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const Dashboard: React.FC = () => {
  const { logout, username, role } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Placeholder data - will be replaced with real API calls
  const metrics = {
    clusters: { total: 0, active: 0 },
    templates: { total: 0 },
    hubs: { total: 0 },
    vms: { total: 0, running: 0 }
  }

  return (
    <Page>
      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Title headingLevel="h1" size="2xl">
                CloudKit Console
              </Title>
            </ToolbarItem>
            <ToolbarItem align={{ default: 'alignEnd' }}>
              <Flex spaceItems={{ default: 'spaceItemsMd' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    Logged in as: <strong>{username}</strong> ({role})
                  </span>
                </FlexItem>
                <FlexItem>
                  <Button variant="secondary" onClick={handleLogout}>
                    Logout
                  </Button>
                </FlexItem>
              </Flex>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
          Overview
        </Title>
        <Gallery hasGutter minWidths={{ default: '100%', md: '250px' }}>
          <GalleryItem>
            <Card isFullHeight>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <span style={{ color: '#06c', fontSize: '1.5rem' }}>
                      <CubeIcon />
                    </span>
                  </FlexItem>
                  <FlexItem>
                    Clusters
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.clusters.total}</div>
                <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                  {metrics.clusters.active} active
                </div>
              </CardBody>
            </Card>
          </GalleryItem>

          <GalleryItem>
            <Card isFullHeight>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <span style={{ color: '#3e8635', fontSize: '1.5rem' }}>
                      <LayerGroupIcon />
                    </span>
                  </FlexItem>
                  <FlexItem>
                    Templates
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.templates.total}</div>
                <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                  available
                </div>
              </CardBody>
            </Card>
          </GalleryItem>

          <GalleryItem>
            <Card isFullHeight>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <span style={{ color: '#f0ab00', fontSize: '1.5rem' }}>
                      <NetworkIcon />
                    </span>
                  </FlexItem>
                  <FlexItem>
                    Hubs
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.hubs.total}</div>
                <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                  management hubs
                </div>
              </CardBody>
            </Card>
          </GalleryItem>

          <GalleryItem>
            <Card isFullHeight>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <span style={{ color: '#8476d1', fontSize: '1.5rem' }}>
                      <VirtualMachineIcon />
                    </span>
                  </FlexItem>
                  <FlexItem>
                    Virtual Machines
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{metrics.vms.total}</div>
                <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                  {metrics.vms.running} running
                </div>
              </CardBody>
            </Card>
          </GalleryItem>
        </Gallery>
      </PageSection>

      <PageSection>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
          Quick Actions
        </Title>
        <Flex spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem>
            <Button variant="primary" isDisabled>
              Create Cluster
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="secondary" isDisabled>
              View Templates
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="secondary" isDisabled>
              Manage Hubs
            </Button>
          </FlexItem>
        </Flex>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6a6e73', fontStyle: 'italic' }}>
          API integration coming soon. Currently displaying placeholder data.
        </p>
      </PageSection>
    </Page>
  )
}

export default Dashboard
