import { useState, useEffect } from 'react'
import {
  PageSection,
  Title,
  Card,
  Button,
  Badge,
  Flex,
  FlexItem,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  ButtonVariant,
  Alert,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core'
import { ThIcon, ListIcon, RocketIcon, InfoCircleIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getTemplates } from '../api/templates'
import { createVirtualMachine } from '../api/vms'
import { Template } from '../api/types'
import { CreateVMWizard } from '../components/wizards/CreateVMWizard'
import { getOSImages, OSImage as OSImageType } from '../api/os-images'

type ViewType = 'cards' | 'list'
type OSImage = OSImageType

interface OSImageWithVersion extends OSImage {
  version: string
}

const OSCatalog: React.FC = () => {
  const [viewType, setViewType] = useState<ViewType>('cards')
  const [searchValue, setSearchValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [osImages, setOsImages] = useState<OSImageWithVersion[]>([])
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<OSImageWithVersion | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [imageForWizard, setImageForWizard] = useState<{os: string, version: string} | null>(null)

  useEffect(() => {
    const loadImages = async () => {
      setLoading(true)
      try {
        // Fetch OS images from API
        const response = await getOSImages()

        // Flatten versions into separate entries
        const flattened: OSImageWithVersion[] = []
        response.images.forEach((image: OSImage) => {
          image.versions.forEach((version: string) => {
            flattened.push({
              ...image,
              version
            })
          })
        })
        setOsImages(flattened)
      } catch (error) {
        console.error('Failed to load OS images:', error)
      } finally {
        setLoading(false)
      }
    }

    loadImages()
  }, [])

  // Load templates for the wizard
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await getTemplates()
        setTemplates(response.items || [])
      } catch (error) {
        console.error('Error fetching templates:', error)
        setTemplates([])
      }
    }
    fetchTemplates()
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
  }

  const handleSearchClear = () => {
    setSearchValue('')
  }

  const handleDeploy = (image: OSImageWithVersion) => {
    setImageForWizard({ os: image.os, version: image.version })
    setWizardOpen(true)
  }

  const handleViewDetails = (image: OSImageWithVersion) => {
    setSelectedImage(image)
    setIsDetailsModalOpen(true)
  }

  const handleCreateVM = async (vmId: string, templateId: string, parameters: Record<string, any>) => {
    await createVirtualMachine({
      id: vmId,
      spec: {
        template: templateId,
        template_parameters: parameters
      }
    })
  }

  // Filter images based on search
  const filteredImages = osImages.filter(image => {
    if (!searchValue.trim()) return true
    const searchLower = searchValue.toLowerCase()
    return (
      image.displayName.toLowerCase().includes(searchLower) ||
      image.os.toLowerCase().includes(searchLower) ||
      image.version.toLowerCase().includes(searchLower) ||
      image.osType.toLowerCase().includes(searchLower)
    )
  })

  const getVendorName = (image: OSImageWithVersion): string => {
    const os = image.os.toLowerCase()
    if (os.includes('fedora')) return 'Fedora Project'
    if (os.includes('centos')) return 'CentOS Project'
    if (os.includes('ubuntu')) return 'Canonical'
    if (os.includes('debian')) return 'Debian Project'
    if (os.includes('rhel')) return 'Red Hat'
    if (os.includes('windows')) return 'Microsoft'
    return 'Community'
  }

  const renderCardsView = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(342px, 1fr))',
      gap: '1rem',
      width: '100%'
    }}>
      {filteredImages.sort((a, b) => a.displayName.localeCompare(b.displayName)).map((image, idx) => {
        const vendor = getVendorName(image)

        return (
          <Card
            key={`${image.os}-${image.version}-${idx}`}
            style={{
              height: '308px',
              border: '1px solid #d2d2d2',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease-in-out',
              cursor: 'pointer',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={() => handleViewDetails(image)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* Header with logo, title */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#fafafa',
              flexShrink: 0,
              minHeight: '80px'
            }}>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <img
                    src={image.icon}
                    alt={`${image.displayName} logo`}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      padding: '4px',
                      backgroundColor: '#f8f8f8',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      const target = e.currentTarget
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div style="
                            width: 64px;
                            height: 64px;
                            background-color: #333333;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 20px;
                          ">
                            ${image.displayName.substring(0, 2).toUpperCase()}
                          </div>
                        `
                      }
                    }}
                  />
                </FlexItem>
                <FlexItem flex={{ default: 'flex_1' }}>
                  <div style={{
                    fontSize: '19px',
                    fontWeight: '600',
                    color: '#151515',
                    lineHeight: '1.2',
                    marginBottom: '2px'
                  }}>
                    {image.displayName} {image.version}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6a6e73',
                    fontWeight: '400',
                    lineHeight: '1.2'
                  }}>
                    By {vendor}
                  </div>
                </FlexItem>
              </Flex>
            </div>

            {/* Content area */}
            <div style={{
              padding: '12px',
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}>
              {/* Repository */}
              <div style={{
                fontSize: '14px',
                color: '#6a6e73',
                lineHeight: '1.3',
                marginBottom: '10px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace'
              }}>
                {image.repository}:{image.version}
              </div>

              {/* OS Type Badge */}
              <div style={{ marginBottom: '10px', flex: '1' }}>
                <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <Badge isRead style={{ fontSize: '14px', padding: '4px 9px' }}>
                      {image.osType}
                    </Badge>
                  </FlexItem>
                  <FlexItem>
                    <Badge isRead color="blue" style={{ fontSize: '14px', padding: '4px 9px' }}>
                      Container Disk
                    </Badge>
                  </FlexItem>
                  {image.available === false && image.comingSoon && (
                    <FlexItem>
                      <Badge style={{
                        fontSize: '14px',
                        padding: '4px 9px',
                        backgroundColor: '#ffa500',
                        color: '#fff'
                      }}>
                        Coming Soon
                      </Badge>
                    </FlexItem>
                  )}
                </Flex>
              </div>

              {/* Version info */}
              <div style={{
                fontSize: '16px',
                color: '#6a6e73',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'flex-end',
                paddingBottom: '4px'
              }}>
                <span><strong style={{ color: '#151515' }}>Version:</strong> {image.version}</span>
              </div>

              {/* Buttons */}
              <div style={{ marginTop: 'auto' }}>
                <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem flex={{ default: 'flex_1' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<RocketIcon style={{ fontSize: '18px' }} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeploy(image)
                      }}
                      isDisabled={image.available === false}
                      style={{ width: '100%', fontSize: '17px', padding: '8px 12px', height: '39px' }}
                    >
                      {image.available === false ? 'Not Available' : 'Create VM'}
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<InfoCircleIcon style={{ fontSize: '18px' }} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(image)
                      }}
                      style={{ fontSize: '17px', padding: '8px 10px', height: '39px' }}
                    >
                      Details
                    </Button>
                  </FlexItem>
                </Flex>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )

  const renderListView = () => (
    <div style={{ border: '1px solid #d2d2d2', borderRadius: '8px' }}>
      {filteredImages.sort((a, b) => a.displayName.localeCompare(b.displayName)).map((image, idx) => {
        const vendor = getVendorName(image)

        return (
          <div
            key={`${image.os}-${image.version}-${idx}`}
            style={{
              padding: '1rem',
              borderBottom: idx < filteredImages.length - 1 ? '1px solid #f0f0f0' : 'none',
              transition: 'background-color 0.2s',
              cursor: 'pointer'
            }}
            onClick={() => handleViewDetails(image)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem>
                <img
                  src={image.icon}
                  alt={`${image.displayName} logo`}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    padding: '4px',
                    backgroundColor: '#f8f8f8',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    const target = e.currentTarget
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div style="
                          width: 64px;
                          height: 64px;
                          background-color: #333333;
                          border-radius: 8px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: white;
                          font-weight: bold;
                          font-size: 20px;
                        ">
                          ${image.displayName.substring(0, 2).toUpperCase()}
                        </div>
                      `
                    }
                  }}
                />
              </FlexItem>
              <FlexItem flex={{ default: 'flex_1' }}>
                <div style={{ fontWeight: '600', fontSize: '16px', color: '#151515', marginBottom: '4px' }}>
                  {image.displayName} {image.version}
                </div>
                <div style={{ color: '#6a6e73', fontSize: '12px', marginBottom: '4px' }}>
                  By {vendor}
                </div>
                <div style={{ color: '#6a6e73', fontSize: '14px', fontFamily: 'monospace' }}>
                  {image.repository}:{image.version}
                </div>
              </FlexItem>
              <FlexItem>
                <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                  <FlexItem>
                    <Badge isRead>{image.osType}</Badge>
                  </FlexItem>
                  <FlexItem>
                    <Badge isRead color="blue">Container Disk</Badge>
                  </FlexItem>
                  {image.available === false && image.comingSoon && (
                    <FlexItem>
                      <Badge style={{
                        backgroundColor: '#ffa500',
                        color: '#fff'
                      }}>
                        Coming Soon
                      </Badge>
                    </FlexItem>
                  )}
                </Flex>
              </FlexItem>
              <FlexItem>
                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <Button
                      variant="primary"
                      icon={<RocketIcon />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeploy(image)
                      }}
                      isDisabled={image.available === false}
                      size="sm"
                      style={{ minWidth: '120px' }}
                    >
                      {image.available === false ? 'Not Available' : 'Create VM'}
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="secondary"
                      icon={<InfoCircleIcon />}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(image)
                      }}
                      style={{ minWidth: '120px' }}
                    >
                      Details
                    </Button>
                  </FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          </div>
        )
      })}
    </div>
  )

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          Operating Systems Catalog
        </Title>
        <p>Browse and deploy virtual machines from available operating system images</p>
      </PageSection>

      <PageSection>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spinner size="lg" />
            <p>Loading OS catalog...</p>
          </div>
        ) : (
          <>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder="Search operating systems..."
                    value={searchValue}
                    onChange={(_event, value) => handleSearchChange(value)}
                    onClear={handleSearchClear}
                    style={{ width: '300px' }}
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <Button
                        variant={viewType === 'cards' ? ButtonVariant.primary : ButtonVariant.secondary}
                        icon={<ThIcon />}
                        onClick={() => setViewType('cards')}
                        size="sm"
                      >
                        Cards
                      </Button>
                    </FlexItem>
                    <FlexItem>
                      <Button
                        variant={viewType === 'list' ? ButtonVariant.primary : ButtonVariant.secondary}
                        icon={<ListIcon />}
                        onClick={() => setViewType('list')}
                        size="sm"
                      >
                        List
                      </Button>
                    </FlexItem>
                  </Flex>
                </ToolbarItem>
                <ToolbarItem align={{ default: 'alignEnd' }}>
                  <div style={{ fontSize: '0.9em', color: '#6a6e73' }}>
                    {searchValue.trim() ? (
                      <>
                        {filteredImages.length} of {osImages.length} image{osImages.length !== 1 ? 's' : ''}
                        {filteredImages.length === 0 && <span style={{ color: '#c9190b' }}> (no matches)</span>}
                      </>
                    ) : (
                      <>
                        {osImages.length} image{osImages.length !== 1 ? 's' : ''} available
                      </>
                    )}
                  </div>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            <div style={{ marginTop: '1rem' }}>
              {filteredImages.length > 0 ? (
                viewType === 'cards' ? renderCardsView() : renderListView()
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  {searchValue.trim() ? (
                    <div>
                      <p>No operating systems found matching "{searchValue}"</p>
                      <Button variant="link" onClick={handleSearchClear}>
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <Alert variant="info" isInline title="No operating system images available" />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </PageSection>

      {/* Details Modal */}
      {selectedImage && (
        <Modal
          variant={ModalVariant.medium}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          aria-labelledby="os-details-modal-title"
        >
          <ModalHeader title={`${selectedImage.displayName} ${selectedImage.version}`} labelId="os-details-modal-title" />
          <ModalBody>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                  <FlexItem>
                    <img
                      src={selectedImage.icon}
                      alt={`${selectedImage.displayName} logo`}
                      style={{
                        width: '96px',
                        height: '96px',
                        borderRadius: '8px',
                        padding: '8px',
                        backgroundColor: '#f8f8f8',
                        objectFit: 'contain'
                      }}
                    />
                  </FlexItem>
                  <FlexItem flex={{ default: 'flex_1' }}>
                    <Title headingLevel="h3" size="xl" style={{ marginBottom: '0.5rem' }}>
                      {selectedImage.displayName} {selectedImage.version}
                    </Title>
                    <div style={{ color: '#6a6e73', fontSize: '14px' }}>
                      By {getVendorName(selectedImage)}
                    </div>
                  </FlexItem>
                </Flex>
              </FlexItem>
              <FlexItem>
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Operating System</DescriptionListTerm>
                    <DescriptionListDescription>{selectedImage.displayName}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Version</DescriptionListTerm>
                    <DescriptionListDescription>{selectedImage.version}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>OS Type</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Badge isRead>{selectedImage.osType}</Badge>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Source Type</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Badge isRead color="blue">Container Disk</Badge>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Repository</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                        {selectedImage.repository}:{selectedImage.version}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Vendor</DescriptionListTerm>
                    <DescriptionListDescription>{getVendorName(selectedImage)}</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </FlexItem>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              icon={<RocketIcon />}
              onClick={() => {
                setIsDetailsModalOpen(false)
                handleDeploy(selectedImage)
              }}
              isDisabled={selectedImage.available === false}
            >
              {selectedImage.available === false ? 'Not Available' : 'Create VM'}
            </Button>
            <Button variant="link" onClick={() => setIsDetailsModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Create VM Wizard */}
      <CreateVMWizard
        isOpen={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
          setImageForWizard(null)
        }}
        onCreate={handleCreateVM}
        templates={templates}
        initialOS={imageForWizard?.os}
        initialVersion={imageForWizard?.version}
      />
    </AppLayout>
  )
}

export default OSCatalog
