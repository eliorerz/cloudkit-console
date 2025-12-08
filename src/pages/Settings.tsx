import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PageSection,
  Title,
  Card,
  CardBody,
  Form,
  FormGroup,
  TextArea,
  Button,
  Alert,
  AlertVariant,
  AlertActionCloseButton,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core'
import { CheckIcon } from '@patternfly/react-icons'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import AppLayout from '../components/layouts/AppLayout'

const Settings: React.FC = () => {
  const { t } = useTranslation(['settings', 'common'])
  const { role } = useAuth()
  const { theme, setTheme: setThemeContext } = useTheme()
  const [defaultPullSecret, setDefaultPullSecret] = useState('')
  const [defaultSshKey, setDefaultSshKey] = useState('')
  const [successAlert, setSuccessAlert] = useState<string | null>(null)
  const [showPullSecret, setShowPullSecret] = useState(false)
  const [showSshKey, setShowSshKey] = useState(false)
  const [selectedSection, setSelectedSection] = useState('general')
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false)

  // Load saved values from localStorage on mount
  useEffect(() => {
    const savedPullSecret = localStorage.getItem('default_pull_secret')
    const savedSshKey = localStorage.getItem('default_ssh_key')

    if (savedPullSecret) {
      setDefaultPullSecret(savedPullSecret)
    }
    if (savedSshKey) {
      setDefaultSshKey(savedSshKey)
    }
  }, [])

  const handleSavePullSecret = () => {
    localStorage.setItem('default_pull_secret', defaultPullSecret)
    setSuccessAlert(t('settings:messages.pullSecretSaved'))
    setTimeout(() => setSuccessAlert(null), 3000)
  }

  const handleSaveSshKey = () => {
    localStorage.setItem('default_ssh_key', defaultSshKey)
    setSuccessAlert(t('settings:messages.sshKeySaved'))
    setTimeout(() => setSuccessAlert(null), 3000)
  }

  const handleThemeChange = (selectedTheme: 'system' | 'light' | 'dark') => {
    setThemeContext(selectedTheme)
    setIsThemeDropdownOpen(false)
  }

  // Get display value for theme dropdown
  const getThemeDisplayValue = () => {
    switch (theme) {
      case 'system':
        return t('settings:general.theme.systemDefault')
      case 'light':
        return t('settings:general.theme.light')
      case 'dark':
        return t('settings:general.theme.dark')
      default:
        return t('settings:general.theme.systemDefault')
    }
  }

  const isAdmin = role === 'fulfillment-admin'

  const renderContent = () => {
    if (selectedSection === 'general') {
      return (
        <div>
          <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
            {t('settings:general.title')}
          </Title>
          <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginBottom: '2rem' }}>
            {t('settings:general.description')}
          </div>

          <Form style={{ maxWidth: '600px' }}>
            <FormGroup label={t('settings:general.theme.label')} fieldId="theme">
              <Dropdown
                isOpen={isThemeDropdownOpen}
                onSelect={() => {}}
                onOpenChange={setIsThemeDropdownOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                    isExpanded={isThemeDropdownOpen}
                    style={{ width: '100%' }}
                  >
                    {getThemeDisplayValue()}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem
                    key="system"
                    onClick={() => handleThemeChange('system')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('settings:general.theme.systemDefault')}</span>
                      {theme === 'system' && <CheckIcon style={{ color: '#06c' }} />}
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="light"
                    onClick={() => handleThemeChange('light')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('settings:general.theme.light')}</span>
                      {theme === 'light' && <CheckIcon style={{ color: '#06c' }} />}
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="dark"
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('settings:general.theme.dark')}</span>
                      {theme === 'dark' && <CheckIcon style={{ color: '#06c' }} />}
                    </div>
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
              <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                {t('settings:general.theme.description')}
              </div>
            </FormGroup>
          </Form>
        </div>
      )
    }

    if (selectedSection === 'authentication' && isAdmin) {
      return (
        <div>
          <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
            {t('settings:authentication.title')}
          </Title>
          <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginBottom: '2rem' }}>
            {t('settings:authentication.description')}
          </div>

          <Card style={{ marginBottom: '1.5rem' }}>
            <CardBody>
              <Form>
                <FormGroup
                  label={t('settings:authentication.pullSecret.label')}
                  isRequired
                  fieldId="default-pull-secret"
                >
                  <div style={{ maxWidth: '734px' }}>
                    <TextArea
                      id="default-pull-secret"
                      value={showPullSecret || !defaultPullSecret ? defaultPullSecret : t('settings:authentication.pullSecret.configured')}
                      onChange={(_event, value) => setDefaultPullSecret(value)}
                      rows={8}
                      placeholder={t('settings:authentication.pullSecret.placeholder')}
                      style={{
                        fontFamily: (showPullSecret || !defaultPullSecret) ? 'monospace' : 'inherit',
                        fontSize: '0.875rem',
                        width: '100%',
                        color: (showPullSecret || !defaultPullSecret) ? '#151515' : '#8a8d90',
                        fontStyle: (showPullSecret || !defaultPullSecret) ? 'normal' : 'italic'
                      }}
                      readOnly={!!(defaultPullSecret && !showPullSecret)}
                    />
                  </div>
                  {defaultPullSecret && (
                    <Button
                      variant="link"
                      onClick={() => setShowPullSecret(!showPullSecret)}
                      style={{ padding: '0.5rem 0', fontSize: '0.875rem' }}
                    >
                      {showPullSecret ? t('common:actions.hide') : t('common:actions.showAndEdit')}
                    </Button>
                  )}
                </FormGroup>
                <div style={{ fontSize: '0.8rem', color: '#6a6e73', marginBottom: '1rem', maxWidth: '734px' }}>
                  {t('settings:authentication.pullSecret.helpText')}{' '}
                  <a
                    href="https://console.redhat.com/openshift/install/pull-secret"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#06c' }}
                  >
                    {t('settings:authentication.openshiftManager')}{' '}
                    <svg
                      viewBox="0 0 512 512"
                      style={{ width: '0.75em', height: '0.75em', verticalAlign: 'middle', display: 'inline-block' }}
                      fill="currentColor"
                    >
                      <path d="M432,320H400a16,16,0,0,0-16,16V448H64V128H208a16,16,0,0,0,16-16V80a16,16,0,0,0-16-16H48A48,48,0,0,0,0,112V464a48,48,0,0,0,48,48H400a48,48,0,0,0,48-48V336A16,16,0,0,0,432,320ZM488,0h-128c-21.37,0-32.05,25.91-17,41l35.73,35.73L135,320.37a24,24,0,0,0,0,34L157.67,377a24,24,0,0,0,34,0L435.28,133.32,471,169c15,15,41,4.5,41-17V24A24,24,0,0,0,488,0Z" />
                    </svg>
                  </a>
                </div>
                <Button
                  variant="primary"
                  onClick={handleSavePullSecret}
                  isDisabled={!defaultPullSecret.trim()}
                  style={{ maxWidth: '180px' }}
                >
                  {t('settings:authentication.pullSecret.button')}
                </Button>
              </Form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Form>
                <FormGroup
                  label={t('settings:authentication.sshKey.label')}
                  fieldId="default-ssh-key"
                >
                  <div style={{ maxWidth: '734px' }}>
                    <TextArea
                      id="default-ssh-key"
                      value={showSshKey || !defaultSshKey ? defaultSshKey : t('settings:authentication.sshKey.configured')}
                      onChange={(_event, value) => setDefaultSshKey(value)}
                      rows={4}
                      placeholder={t('settings:authentication.sshKey.placeholder')}
                      style={{
                        fontFamily: (showSshKey || !defaultSshKey) ? 'monospace' : 'inherit',
                        fontSize: '0.875rem',
                        width: '100%',
                        color: (showSshKey || !defaultSshKey) ? '#151515' : '#8a8d90',
                        fontStyle: (showSshKey || !defaultSshKey) ? 'normal' : 'italic'
                      }}
                      readOnly={!!(defaultSshKey && !showSshKey)}
                    />
                  </div>
                  {defaultSshKey && (
                    <Button
                      variant="link"
                      onClick={() => setShowSshKey(!showSshKey)}
                      style={{ padding: '0.5rem 0', fontSize: '0.875rem' }}
                    >
                      {showSshKey ? t('common:actions.hide') : t('common:actions.showAndEdit')}
                    </Button>
                  )}
                </FormGroup>
                <div style={{ fontSize: '0.8rem', color: '#6a6e73', marginBottom: '1rem', maxWidth: '734px' }}>
                  {t('settings:authentication.sshKey.helpText')}
                </div>
                <Button
                  variant="primary"
                  onClick={handleSaveSshKey}
                  isDisabled={!defaultSshKey.trim()}
                  style={{ maxWidth: '180px' }}
                >
                  {t('settings:authentication.sshKey.button')}
                </Button>
              </Form>
            </CardBody>
          </Card>
        </div>
      )
    }

    return null
  }

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="2xl" style={{ marginBottom: '1.5rem' }}>
          {t('settings:title')}
        </Title>

        {successAlert && (
          <Alert
            variant={AlertVariant.success}
            title={successAlert}
            actionClose={<AlertActionCloseButton onClose={() => setSuccessAlert(null)} />}
            style={{ marginBottom: '1.5rem' }}
          />
        )}

        <div style={{ display: 'flex', gap: '2rem' }}>
          {/* Sidebar Navigation */}
          <div style={{
            width: '220px',
            flexShrink: 0,
            borderRight: '1px solid #d2d2d2',
            paddingRight: '1rem'
          }}>
            <div
              onClick={() => setSelectedSection('general')}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                backgroundColor: selectedSection === 'general' ? '#f0f0f0' : 'transparent',
                borderLeft: selectedSection === 'general' ? '3px solid #06c' : '3px solid transparent',
                marginLeft: '-1rem',
                paddingLeft: 'calc(1rem - 3px)',
                color: selectedSection === 'general' ? '#151515' : '#6a6e73'
              }}
            >
              {t('settings:sections.general')}
            </div>
            {isAdmin && (
              <div
                onClick={() => setSelectedSection('authentication')}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: selectedSection === 'authentication' ? '#f0f0f0' : 'transparent',
                  borderLeft: selectedSection === 'authentication' ? '3px solid #06c' : '3px solid transparent',
                  marginLeft: '-1rem',
                  paddingLeft: 'calc(1rem - 3px)',
                  color: selectedSection === 'authentication' ? '#151515' : '#6a6e73'
                }}
              >
                {t('settings:sections.authentication')}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, maxWidth: '800px' }}>
            {renderContent()}
          </div>
        </div>
      </PageSection>
    </AppLayout>
  )
}

export default Settings
