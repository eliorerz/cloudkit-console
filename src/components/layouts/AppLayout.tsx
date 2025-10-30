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
} from '@patternfly/react-core'
import { BarsIcon, BellIcon, QuestionCircleIcon } from '@patternfly/react-icons'
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
  const { logout, username, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const onNavSelect = (selectedItem: { itemId: string | number }) => {
    if (selectedItem.itemId === 'dashboard') {
      navigate('/')
    } else if (selectedItem.itemId === 'virtual-machines') {
      navigate('/virtual-machines')
    } else if (selectedItem.itemId === 'templates') {
      navigate('/templates')
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

  const getToken = () => {
    return localStorage.getItem('cloudkit_token') || 'No token available'
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
                height: '32px',
                width: '32px'
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
                    {username} ({role})
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem key="token" onClick={showTokenModal}>
                    View Token
                  </DropdownItem>
                  <DropdownItem key="logout" onClick={handleLogout}>
                    Logout
                  </DropdownItem>
                </DropdownList>
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
        <Nav onSelect={(_event, result) => onNavSelect(result)} aria-label="Nav">
          <NavList>
            <NavItem
              itemId="dashboard"
              isActive={location.pathname === '/' || location.pathname === '/dashboard'}
            >
              Dashboard
            </NavItem>
            <NavItem
              itemId="virtual-machines"
              isActive={location.pathname === '/virtual-machines'}
            >
              Virtual Machines
            </NavItem>
            <NavItem
              itemId="templates"
              isActive={location.pathname === '/templates'}
            >
              Templates
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
          <div style={{
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            wordBreak: 'break-all',
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          }}>
            {getToken()}
          </div>
        </ModalBody>
      </Modal>
    </>
  )
}

export default AppLayout
