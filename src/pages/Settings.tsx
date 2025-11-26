import { useState, useEffect } from 'react'
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
import { useAuth } from '../contexts/AuthContext'
import AppLayout from '../components/layouts/AppLayout'

const Settings: React.FC = () => {
  const { role } = useAuth()
  const [defaultPullSecret, setDefaultPullSecret] = useState('')
  const [defaultSshKey, setDefaultSshKey] = useState('')
  const [successAlert, setSuccessAlert] = useState<string | null>(null)
  const [showPullSecret, setShowPullSecret] = useState(false)
  const [showSshKey, setShowSshKey] = useState(false)
  const [selectedSection, setSelectedSection] = useState('general')
  const [theme, setTheme] = useState('Light')
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false)

  // Load saved values from localStorage on mount
  useEffect(() => {
    const savedPullSecret = localStorage.getItem('default_pull_secret')
    const savedSshKey = localStorage.getItem('default_ssh_key')
    const savedTheme = localStorage.getItem('theme')

    if (savedPullSecret) {
      setDefaultPullSecret(savedPullSecret)
    }
    if (savedSshKey) {
      setDefaultSshKey(savedSshKey)
    }
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const handleSavePullSecret = () => {
    localStorage.setItem('default_pull_secret', defaultPullSecret)
    setSuccessAlert('Default pull secret saved successfully')
    setTimeout(() => setSuccessAlert(null), 3000)
  }

  const handleSaveSshKey = () => {
    localStorage.setItem('default_ssh_key', defaultSshKey)
    setSuccessAlert('Default SSH key saved successfully')
    setTimeout(() => setSuccessAlert(null), 3000)
  }

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme)
    localStorage.setItem('theme', selectedTheme)
    setIsThemeDropdownOpen(false)
  }

  const isAdmin = role === 'fulfillment-admin'

  const renderContent = () => {
    if (selectedSection === 'general') {
      return (
        <div>
          <Title headingLevel="h2" size="xl" style={{ marginBottom: '1.5rem' }}>
            General
          </Title>
          <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginBottom: '2rem' }}>
            Set your individual preferences for the console experience. Any changes will be autosaved.
          </div>

          <Form style={{ maxWidth: '600px' }}>
            <FormGroup label="Theme" fieldId="theme">
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
                    {theme}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem
                    key="system"
                    onClick={() => handleThemeChange('System default')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>System default</span>
                      {theme === 'System default' && <CheckIcon style={{ color: '#06c' }} />}
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="light"
                    onClick={() => handleThemeChange('Light')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Light</span>
                      {theme === 'Light' && <CheckIcon style={{ color: '#06c' }} />}
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="dark"
                    onClick={() => handleThemeChange('Dark')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Dark</span>
                      {theme === 'Dark' && <CheckIcon style={{ color: '#06c' }} />}
                    </div>
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
              <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginTop: '0.5rem' }}>
                Console will appear as per the selected theme.
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
            Authentication
          </Title>
          <div style={{ fontSize: '0.875rem', color: '#6a6e73', marginBottom: '2rem' }}>
            Configure default authentication credentials for cluster deployments.
          </div>

          <Card style={{ marginBottom: '1.5rem' }}>
            <CardBody>
              <Form>
                <FormGroup
                  label="Pull Secret"
                  isRequired
                  fieldId="default-pull-secret"
                >
                  <div style={{ maxWidth: '734px' }}>
                    <TextArea
                      id="default-pull-secret"
                      value={showPullSecret ? defaultPullSecret : (defaultPullSecret ? 'Pull secret is configured. Click "Show and edit" below to view or modify.' : '')}
                      onChange={(_event, value) => setDefaultPullSecret(value)}
                      rows={8}
                      placeholder='{"auths":{"cloud.openshift.com":{"auth":"...","email":"..."}}}'
                      style={{
                        fontFamily: showPullSecret ? 'monospace' : 'inherit',
                        fontSize: '0.875rem',
                        width: '100%',
                        color: showPullSecret ? '#151515' : '#8a8d90',
                        fontStyle: showPullSecret ? 'normal' : 'italic'
                      }}
                      readOnly={!showPullSecret}
                    />
                  </div>
                  {defaultPullSecret && (
                    <Button
                      variant="link"
                      onClick={() => setShowPullSecret(!showPullSecret)}
                      style={{ padding: '0.5rem 0', fontSize: '0.875rem' }}
                    >
                      {showPullSecret ? 'Hide' : 'Show and edit'}
                    </Button>
                  )}
                </FormGroup>
                <div style={{ fontSize: '0.8rem', color: '#6a6e73', marginBottom: '1rem', maxWidth: '734px' }}>
                  A Red Hat account pull secret can be found in{' '}
                  <a
                    href="https://console.redhat.com/openshift/install/pull-secret"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#06c' }}
                  >
                    OpenShift Cluster Manager{' '}
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
                  Save Pull Secret
                </Button>
              </Form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Form>
                <FormGroup
                  label="SSH Public Key"
                  fieldId="default-ssh-key"
                >
                  <div style={{ maxWidth: '734px' }}>
                    <TextArea
                      id="default-ssh-key"
                      value={showSshKey ? defaultSshKey : (defaultSshKey ? 'SSH public key is configured. Click "Show and edit" below to view or modify.' : '')}
                      onChange={(_event, value) => setDefaultSshKey(value)}
                      rows={4}
                      placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
                      style={{
                        fontFamily: showSshKey ? 'monospace' : 'inherit',
                        fontSize: '0.875rem',
                        width: '100%',
                        color: showSshKey ? '#151515' : '#8a8d90',
                        fontStyle: showSshKey ? 'normal' : 'italic'
                      }}
                      readOnly={!showSshKey}
                    />
                  </div>
                  {defaultSshKey && (
                    <Button
                      variant="link"
                      onClick={() => setShowSshKey(!showSshKey)}
                      style={{ padding: '0.5rem 0', fontSize: '0.875rem' }}
                    >
                      {showSshKey ? 'Hide' : 'Show and edit'}
                    </Button>
                  )}
                </FormGroup>
                <div style={{ fontSize: '0.8rem', color: '#6a6e73', marginBottom: '1rem', maxWidth: '734px' }}>
                  This SSH key will be used by default for all cluster deployments unless overridden.
                </div>
                <Button
                  variant="primary"
                  onClick={handleSaveSshKey}
                  isDisabled={!defaultSshKey.trim()}
                  style={{ maxWidth: '180px' }}
                >
                  Save SSH Key
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
          User Preferences
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
              General
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
                Authentication
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
