import {
  Page,
  PageSection,
  Title,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const Dashboard: React.FC = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
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
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>
      <PageSection>
        <Title headingLevel="h2" size="xl">
          Welcome to CloudKit Console
        </Title>
        <p style={{ marginTop: '1rem' }}>
          Dashboard and cluster management features coming soon...
        </p>
      </PageSection>
    </Page>
  )
}

export default Dashboard
