import {
  PageSection,
  Title,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  List,
  ListItem,
  Label,
  Flex,
  FlexItem,
} from '@patternfly/react-core'
import { BuildingIcon, UsersIcon } from '@patternfly/react-icons'
import { useAuth } from '../contexts/AuthContext'
import AppLayout from '../components/layouts/AppLayout'

const Organizations: React.FC = () => {
  const { organizations, role, username } = useAuth()

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
          Organizations
        </Title>

        <Card>
          <CardTitle>
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                <BuildingIcon style={{ marginRight: '0.5rem', color: '#06c' }} />
              </FlexItem>
              <FlexItem>
                Your Organizations
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            {organizations.length === 0 ? (
              <EmptyState>
                <UsersIcon style={{ fontSize: '3rem', color: '#6a6e73', marginBottom: '1rem' }} />
                <Title headingLevel="h4" size="lg">
                  No Organizations
                </Title>
                <EmptyStateBody>
                  You are not assigned to any organizations. Please contact your administrator.
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <>
                <p style={{ marginBottom: '1rem', color: '#6a6e73' }}>
                  You have access to the following organizations:
                </p>
                <List isPlain>
                  {organizations.map((org) => (
                    <ListItem key={org}>
                      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                        <FlexItem>
                          <BuildingIcon />
                        </FlexItem>
                        <FlexItem>
                          <strong>{org}</strong>
                        </FlexItem>
                        {role === 'fulfillment-admin' && org === '/admins' && (
                          <FlexItem>
                            <Label color="purple">Administrator</Label>
                          </FlexItem>
                        )}
                      </Flex>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardBody>
        </Card>

        <Card style={{ marginTop: '1.5rem' }}>
          <CardTitle>
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                <UsersIcon style={{ marginRight: '0.5rem', color: '#3e8635' }} />
              </FlexItem>
              <FlexItem>
                User Information
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            <List isPlain>
              <ListItem>
                <strong>Username:</strong> {username || 'N/A'}
              </ListItem>
              <ListItem>
                <strong>Role:</strong> {role || 'N/A'}
              </ListItem>
              <ListItem>
                <strong>Organization Count:</strong> {organizations.length}
              </ListItem>
            </List>
          </CardBody>
        </Card>

        {role === 'fulfillment-admin' && (
          <Card style={{ marginTop: '1.5rem' }}>
            <CardTitle>Organization Management</CardTitle>
            <CardBody>
              <EmptyState>
                <BuildingIcon style={{ fontSize: '3rem', color: '#6a6e73', marginBottom: '1rem' }} />
                <Title headingLevel="h4" size="lg">
                  Coming Soon
                </Title>
                <EmptyStateBody>
                  Organization management features will be available once the backend API is implemented.
                  This will allow administrators to create, update, and manage organizations.
                </EmptyStateBody>
              </EmptyState>
            </CardBody>
          </Card>
        )}
      </PageSection>
    </AppLayout>
  )
}

export default Organizations
