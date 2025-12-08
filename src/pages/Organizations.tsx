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
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/layouts/AppLayout'

const Organizations: React.FC = () => {
  const { t } = useTranslation(['organizations'])
  const { organizations, role, username } = useAuth()

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
          {t('organizations:title')}
        </Title>

        <Card>
          <CardTitle>
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                <BuildingIcon style={{ marginRight: '0.5rem', color: '#06c' }} />
              </FlexItem>
              <FlexItem>
                {t('organizations:yourOrganizations.title')}
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            {organizations.length === 0 ? (
              <EmptyState>
                <UsersIcon style={{ fontSize: '3rem', color: '#6a6e73', marginBottom: '1rem' }} />
                <Title headingLevel="h4" size="lg">
                  {t('organizations:yourOrganizations.noOrganizations')}
                </Title>
                <EmptyStateBody>
                  {t('organizations:yourOrganizations.noOrganizationsDescription')}
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <>
                <p style={{ marginBottom: '1rem', color: '#6a6e73' }}>
                  {t('organizations:yourOrganizations.description')}
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
                            <Label color="purple">{t('organizations:yourOrganizations.administrator')}</Label>
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
                {t('organizations:userInformation.title')}
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            <List isPlain>
              <ListItem>
                <strong>{t('organizations:userInformation.username')}:</strong> {username || 'N/A'}
              </ListItem>
              <ListItem>
                <strong>{t('organizations:userInformation.role')}:</strong> {role || 'N/A'}
              </ListItem>
              <ListItem>
                <strong>{t('organizations:userInformation.organizationCount')}:</strong> {organizations.length}
              </ListItem>
            </List>
          </CardBody>
        </Card>

        {role === 'fulfillment-admin' && (
          <Card style={{ marginTop: '1.5rem' }}>
            <CardTitle>{t('organizations:management.title')}</CardTitle>
            <CardBody>
              <EmptyState>
                <BuildingIcon style={{ fontSize: '3rem', color: '#6a6e73', marginBottom: '1rem' }} />
                <Title headingLevel="h4" size="lg">
                  {t('organizations:management.comingSoon')}
                </Title>
                <EmptyStateBody>
                  {t('organizations:management.comingSoonDescription')}
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
