import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { BarsIcon, BellIcon, QuestionCircleIcon, CopyIcon, GlobeIcon, ThIcon, ExternalLinkAltIcon } from '@patternfly/react-icons'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import '../../styles/app.css'

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation(['navigation', 'common'])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)
  const [isPerspectiveDropdownOpen, setIsPerspectiveDropdownOpen] = useState(false)
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false)

  // Get language code from current i18n language
  const getLanguageCode = (): string => {
    if (i18n.language === 'zh') return 'ZH'
    if (i18n.language === 'zh-TW') return 'TW'
    if (i18n.language === 'es') return 'ES'
    if (i18n.language === 'pt-BR') return 'PT'
    return 'EN'
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
    setIsLanguageDropdownOpen(false)
  }

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
    } else if (selectedItem.itemId === 'bare-metal-hosts') {
      navigate('/bare-metal-hosts')
    } else if (selectedItem.itemId === 'virtual-machines') {
      navigate('/virtual-machines')
    } else if (selectedItem.itemId === 'templates') {
      navigate('/templates')
    } else if (selectedItem.itemId === 'organizations') {
      navigate('/organizations')
    } else if (selectedItem.itemId === 'hubs') {
      navigate('/hubs')
    } else if (selectedItem.itemId === 'cluster-catalog') {
      navigate('/admin/cluster-catalog')
    } else if (selectedItem.itemId === 'clusters') {
      navigate('/admin/clusters')
    } else if (selectedItem.itemId === 'settings') {
      navigate('/settings')
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
              alt="OSAC"
              style={{
                height: '60px',
                width: '60px'
              }}
            />
            <div style={{ fontSize: '1.125rem' }}>
              <span style={{ fontWeight: '500' }}>Open</span>
              {' '}
              <span style={{ fontWeight: '500' }}>Sovereign</span>
              {' '}
              <span style={{ fontWeight: '500', color: '#c61d1d' }}>AI</span>
              {' '}
              <span style={{ fontWeight: '500' }}>Cloud</span>
            </div>
          </div>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight>
          <ToolbarContent>
            <ToolbarItem align={{ default: 'alignEnd' }}>
              <Dropdown
                isOpen={isAppLauncherOpen}
                onSelect={() => setIsAppLauncherOpen(false)}
                onOpenChange={setIsAppLauncherOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsAppLauncherOpen(!isAppLauncherOpen)}
                    isExpanded={isAppLauncherOpen}
                    variant="plain"
                    aria-label="Application Launcher"
                  >
                    <ThIcon />
                  </MenuToggle>
                )}
              >
                <div style={{ padding: '1rem', minWidth: '280px' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#6a6e73',
                    marginBottom: '0.75rem'
                  }}>
                    Red Hat Applications
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <a
                      href="https://console.redhat.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        color: '#151515',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0'
                        const icon = e.currentTarget.querySelector('.external-icon') as HTMLElement
                        if (icon) icon.style.opacity = '1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        const icon = e.currentTarget.querySelector('.external-icon') as HTMLElement
                        if (icon) icon.style.opacity = '0'
                      }}
                    >
                      <img
                        src="https://cdn.brandfetch.io/idv-kXnBLU/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1677048646511"
                        alt="Red Hat"
                        style={{ width: '24px', height: '24px', marginRight: '0.75rem' }}
                      />
                      <span style={{ flex: 1 }}>Red Hat Hybrid Cloud Console</span>
                      <span className="external-icon" style={{ opacity: 0, transition: 'opacity 0.2s', marginLeft: '0.5rem' }}>
                        <ExternalLinkAltIcon style={{ fontSize: '0.75rem' }} />
                      </span>
                    </a>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        color: '#151515',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0'
                        const icon = e.currentTarget.querySelector('.external-icon') as HTMLElement
                        if (icon) icon.style.opacity = '1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        const icon = e.currentTarget.querySelector('.external-icon') as HTMLElement
                        if (icon) icon.style.opacity = '0'
                      }}
                    >
                      <img
                        src="https://cdn.brandfetch.io/idv-kXnBLU/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1677048646511"
                        alt="Red Hat"
                        style={{ width: '24px', height: '24px', marginRight: '0.75rem' }}
                      />
                      <span style={{ flex: 1 }}>Advanced Cluster Management</span>
                      <span className="external-icon" style={{ opacity: 0, transition: 'opacity 0.2s', marginLeft: '0.5rem' }}>
                        <ExternalLinkAltIcon style={{ fontSize: '0.75rem' }} />
                      </span>
                    </a>
                  </div>
                </div>
              </Dropdown>
            </ToolbarItem>
            <ToolbarItem>
              <Button variant="plain" aria-label={t('navigation:header.notifications')}>
                <BellIcon />
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Dropdown
                isOpen={isLanguageDropdownOpen}
                onSelect={() => setIsLanguageDropdownOpen(false)}
                onOpenChange={setIsLanguageDropdownOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                    isExpanded={isLanguageDropdownOpen}
                    variant="plain"
                    aria-label={t('navigation:header.language')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <GlobeIcon />
                      <span style={{ fontSize: '0.75rem' }}>{getLanguageCode()}</span>
                    </div>
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem
                    key="en-us"
                    onClick={() => changeLanguage('en')}
                  >
                    {t('navigation:language.en')}
                  </DropdownItem>
                  <DropdownItem
                    key="zh-cn"
                    onClick={() => changeLanguage('zh')}
                  >
                    {t('navigation:language.zh')}
                  </DropdownItem>
                  <DropdownItem
                    key="zh-tw"
                    onClick={() => changeLanguage('zh-TW')}
                  >
                    {t('navigation:language.zh-TW')}
                  </DropdownItem>
                  <DropdownItem
                    key="es"
                    onClick={() => changeLanguage('es')}
                  >
                    {t('navigation:language.es')}
                  </DropdownItem>
                  <DropdownItem
                    key="pt-br"
                    onClick={() => changeLanguage('pt-BR')}
                  >
                    {t('navigation:language.pt-BR')}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ToolbarItem>
            <ToolbarItem>
              <Button variant="plain" aria-label={t('navigation:header.help')}>
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
                    {displayName} ({role?.replace('fulfillment-', '') || 'client'})
                  </MenuToggle>
                )}
              >
                <div style={{ padding: '0.75rem 1rem', minWidth: '240px' }}>
                  <DescriptionList isCompact>
                    <DescriptionListGroup>
                      <DescriptionListTerm style={{ color: '#6a6e73', fontSize: '0.875rem', fontWeight: 700 }}>
                        {t('navigation:user.username')}:
                      </DescriptionListTerm>
                      <DescriptionListDescription style={{ color: '#6a6e73', fontSize: '0.875rem' }}>
                        {username || 'N/A'}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm style={{ color: '#6a6e73', fontSize: '0.875rem', fontWeight: 700 }}>
                        {t('navigation:user.accountNumber')}:
                      </DescriptionListTerm>
                      <DescriptionListDescription style={{ color: '#6a6e73', fontSize: '0.875rem' }}>
                        <Tooltip content={<div>{userUuid}</div>}>
                          <span style={{ cursor: 'help' }}>{last12Digits}</span>
                        </Tooltip>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm style={{ color: '#6a6e73', fontSize: '0.875rem', fontWeight: 700 }}>
                        {t('navigation:user.organization')}:
                      </DescriptionListTerm>
                      <DescriptionListDescription style={{ color: '#6a6e73', fontSize: '0.875rem' }}>
                        {primaryOrg}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                  <Divider style={{ margin: '1rem 0' }} />
                  <DropdownList style={{ marginLeft: '-1rem', marginRight: '-1rem' }}>
                    <DropdownItem key="token" onClick={showTokenModal}>
                      {t('navigation:user.viewToken')}
                    </DropdownItem>
                    <DropdownItem key="logout" onClick={handleLogout}>
                      {t('navigation:user.logout')}
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
                      {t('navigation:perspective.administrator')}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem
                      key="administrator"
                    >
                      {t('navigation:perspective.administrator')}
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </div>
            )}

            <NavItem
              itemId="dashboard"
              isActive={location.pathname === '/' || location.pathname === '/overview'}
            >
              {t('navigation:sidebar.overview')}
            </NavItem>

            <NavItem
              itemId="monitoring-dashboard"
              isActive={location.pathname === '/monitoring'}
            >
              {t('navigation:sidebar.monitoring')}
            </NavItem>

            {role === 'fulfillment-admin' && (
              <>
                <div style={{
                  padding: '1rem 1rem 0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--pf-v6-global--Color--200)',
                  borderBottom: '1px solid rgb(210, 210, 210)'
                }}>
                  {t('navigation:sidebar.platform')}
                </div>

                <NavItem
                  itemId="hubs"
                  isActive={location.pathname === '/hubs'}
                >
                  {t('navigation:sidebar.hubs')}
                </NavItem>
                <NavItem
                  itemId="organizations"
                  isActive={location.pathname === '/organizations'}
                >
                  {t('navigation:sidebar.organizations')}
                </NavItem>
              </>
            )}

            <div style={{
              padding: '1rem 1rem 0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--pf-v6-global--Color--200)',
              borderBottom: '1px solid rgb(210, 210, 210)'
            }}>
              {t('navigation:sidebar.workloads')}
            </div>

            <NavItem
              itemId="bare-metal-hosts"
              isActive={location.pathname === '/bare-metal-hosts'}
            >
              {t('navigation:sidebar.bareMetalHosts')}
            </NavItem>

            <NavItem
              itemId="virtual-machines"
              isActive={location.pathname === '/virtual-machines'}
            >
              {t('navigation:sidebar.virtualMachines')}
            </NavItem>

            {role === 'fulfillment-admin' && (
              <NavItem
                itemId="clusters"
                isActive={location.pathname.startsWith('/admin/clusters')}
              >
                {t('navigation:sidebar.managedClusters')}
              </NavItem>
            )}

            <NavItem
              itemId="templates"
              isActive={location.pathname === '/templates'}
            >
              {t('navigation:sidebar.vmTemplates')}
            </NavItem>

            {role === 'fulfillment-admin' && (
              <NavItem
                itemId="cluster-catalog"
                isActive={location.pathname === '/admin/cluster-catalog'}
              >
                {t('navigation:sidebar.clusterCatalog')}
              </NavItem>
            )}

            <div style={{ flexGrow: 1 }} />

            <NavItem
              itemId="settings"
              isActive={location.pathname === '/settings'}
            >
              {t('navigation:sidebar.settings')}
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
        <ModalHeader title={t('navigation:token.title')} labelId="token-modal-title" />
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
