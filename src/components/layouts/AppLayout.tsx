import { useState } from 'react'
import {
  Page,
  Masthead,
  MastheadMain,
  MastheadBrand,
  MastheadContent,
  PageSidebar,
  PageSidebarBody,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Nav,
  NavList,
  NavItem,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  InputGroup,
  InputGroupItem,
  TextInput,
  Tooltip,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Divider,
} from '@patternfly/react-core'
import { BarsIcon, BellIcon, QuestionCircleIcon, CopyIcon } from '@patternfly/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import '../../styles/app.css'

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)
  const [isPerspectiveDropdownOpen, setIsPerspectiveDropdownOpen] = useState(false)
  const [selectedPerspective, setSelectedPerspective] = useState('Administrator')
  const { logout, username, displayName, role, token, user, organizations } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get user UUID (sub) and organization
  const userUuid = user?.profile?.sub || ''
  const last12Digits = userUuid.length >= 12 ? userUuid.slice(-12) : userUuid
  const primaryOrg = organizations
    .filter(org => org !== '/admins')
    .map(org => org.replace(/^\//, ''))
    .find(org => org.length > 0) || 'No Organization'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const onNavSelect = (selectedItem: { itemId: string | number }) => {
    if (selectedItem.itemId === 'dashboard') {
      navigate('/overview')
    } else if (selectedItem.itemId === 'monitoring-dashboard') {
      navigate('/monitoring')
    } else if (selectedItem.itemId === 'virtual-machines') {
      navigate('/virtual-machines')
    } else if (selectedItem.itemId === 'templates') {
      navigate('/templates')
    } else if (selectedItem.itemId === 'organizations') {
      navigate('/organizations')
    } else if (selectedItem.itemId === 'hubs') {
      navigate('/hubs')
    } else if (selectedItem.itemId === 'cluster-templates') {
      navigate('/admin/cluster-templates')
    } else if (selectedItem.itemId === 'clusters') {
      navigate('/admin/clusters')
    }
  }

  const onUserDropdownToggle = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen)
  }

  const onUserDropdownSelect = () => {
    setIsUserDropdownOpen(false)
  }

  const showTokenModal = () => {
    setIsTokenModalOpen(true)
    setIsUserDropdownOpen(false)
  }

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token)
    }
  }

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0 1rem 0 0.75rem'
          }}>
            <Button
              variant="plain"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
              style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}
            >
              <BarsIcon />
            </Button>
            <img
              src="/logo.png"
              alt="CloudKit"
              style={{
                height: '50px',
                width: '50px'
              }}
            />
            <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>
              CloudKit Console
            </div>
          </div>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight>
          <ToolbarContent>
            <ToolbarItem align={{ default: 'alignEnd' }}>
              <Button variant="plain" aria-label="Notifications">
                <BellIcon />
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button variant="plain" aria-label="Help">
                <QuestionCircleIcon />
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Dropdown
                isOpen={isUserDropdownOpen}
                onSelect={onUserDropdownSelect}
                onOpenChange={setIsUserDropdownOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={onUserDropdownToggle}
                    isExpanded={isUserDropdownOpen}
                    style={{ fontSize: '0.875rem', color: '#151515' }}
                  >
                    {displayName} ({role})
                  </MenuToggle>
                )}
              >
                <div style={{ padding: '0.75rem 1rem', minWidth: '240px' }}>
                  <DescriptionList isCompact>
                    <DescriptionListGroup>
                      <DescriptionListTerm style={{ color: '#6a6e73', fontSize: '0.875rem', fontWeight: 700 }}>
                        Username:
                      </DescriptionListTerm>
                      <DescriptionListDescription style={{ color: '#6a6e73', fontSize: '0.875rem' }}>
                        {username || 'N/A'}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm style={{ color: '#6a6e73', fontSize: '0.875rem', fontWeight: 700 }}>
                        Account number:
                      </DescriptionListTerm>
                      <DescriptionListDescription style={{ color: '#6a6e73', fontSize: '0.875rem' }}>
                        <Tooltip content={<div>{userUuid}</div>}>
                          <span style={{ cursor: 'help' }}>{last12Digits}</span>
                        </Tooltip>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm style={{ color: '#6a6e73', fontSize: '0.875rem', fontWeight: 700 }}>
                        Organization:
                      </DescriptionListTerm>
                      <DescriptionListDescription style={{ color: '#6a6e73', fontSize: '0.875rem' }}>
                        {primaryOrg}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                  <Divider style={{ margin: '1rem 0' }} />
                  <DropdownList style={{ marginLeft: '-1rem', marginRight: '-1rem' }}>
                    <DropdownItem key="token" onClick={showTokenModal}>
                      View Token
                    </DropdownItem>
                    <DropdownItem key="logout" onClick={handleLogout}>
                      Logout
                    </DropdownItem>
                  </DropdownList>
                </div>
              </Dropdown>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  )

  const sidebar = (
    <PageSidebar isSidebarOpen={isSidebarOpen}>
      <PageSidebarBody>
        <Nav onSelect={(_event, result) => onNavSelect(result)} aria-label="Nav" style={{ height: '100%' }}>
          <NavList style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {role === 'fulfillment-admin' && (
              <div style={{ padding: '0rem 1rem 1rem 0.5rem' }}>
                <Dropdown
                  isOpen={isPerspectiveDropdownOpen}
                  onSelect={() => setIsPerspectiveDropdownOpen(false)}
                  onOpenChange={setIsPerspectiveDropdownOpen}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsPerspectiveDropdownOpen(!isPerspectiveDropdownOpen)}
                      isExpanded={isPerspectiveDropdownOpen}
                      style={{ fontSize: '0.875rem', width: '100%' }}
                    >
                      {selectedPerspective}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem
                      key="administrator"
                      onClick={() => setSelectedPerspective('Administrator')}
                    >
                      Administrator
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </div>
            )}

            <NavItem
              itemId="dashboard"
              isActive={location.pathname === '/' || location.pathname === '/overview'}
            >
              Overview
            </NavItem>

            <NavItem
              itemId="monitoring-dashboard"
              isActive={location.pathname === '/monitoring'}
            >
              Monitoring
            </NavItem>

            <div style={{
              padding: '1rem 1rem 0rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--pf-v6-global--Color--200)'
            }}>
              Workloads
            </div>

            <NavItem
              itemId="virtual-machines"
              isActive={location.pathname === '/virtual-machines'}
            >
              Virtual Machines
            </NavItem>

            {role === 'fulfillment-admin' && (
              <NavItem
                itemId="clusters"
                isActive={location.pathname.startsWith('/admin/clusters')}
              >
                Managed Clusters
              </NavItem>
            )}

            <div style={{
              padding: '1rem 1rem 0rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--pf-v6-global--Color--200)'
            }}>
              Templates
            </div>

            <NavItem
              itemId="templates"
              isActive={location.pathname === '/templates'}
            >
              VM Templates
            </NavItem>

            {role === 'fulfillment-admin' && (
              <NavItem
                itemId="cluster-templates"
                isActive={location.pathname === '/admin/cluster-templates'}
              >
                Cluster Templates
              </NavItem>
            )}

            {role === 'fulfillment-admin' && (
              <>
                <div style={{
                  padding: '1rem 1rem 0rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--pf-v6-global--Color--200)'
                }}>
                  Platform
                </div>

                <NavItem
                  itemId="hubs"
                  isActive={location.pathname === '/hubs'}
                >
                  Hubs
                </NavItem>
                <NavItem
                  itemId="organizations"
                  isActive={location.pathname === '/organizations'}
                >
                  Organizations
                </NavItem>
              </>
            )}

            <div style={{ flexGrow: 1 }} />

            <NavItem
              itemId="settings"
              isActive={location.pathname === '/settings'}
              disabled
            >
              Settings
            </NavItem>
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  )

  return (
    <>
      <Page masthead={header} sidebar={sidebar} mainContainerId="main-content">
        {children}
      </Page>
      <Modal
        variant={ModalVariant.small}
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        aria-labelledby="token-modal-title"
      >
        <ModalHeader title="Authentication Token" labelId="token-modal-title" />
        <ModalBody>
          <InputGroup>
            <InputGroupItem isFill>
              <TextInput
                type="password"
                value={token || ''}
                readOnly
                aria-label="Authentication token"
              />
            </InputGroupItem>
            <InputGroupItem>
              <Button
                variant="control"
                onClick={copyToken}
                aria-label="Copy token"
                isDisabled={!token}
              >
                <CopyIcon />
              </Button>
            </InputGroupItem>
          </InputGroup>
        </ModalBody>
      </Modal>
    </>
  )
}

export default AppLayout
