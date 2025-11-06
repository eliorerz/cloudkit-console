import { useState, useEffect } from 'react'
import {
  PageSection,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Button,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  Form,
  FormGroup,
  TextInput,
  TextArea,
  Alert,
  AlertVariant,
} from '@patternfly/react-core'
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table'
import { PlusIcon, TrashIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getHubs, createHub, deleteHub } from '../api/hubs'
import { Hub } from '../api/types'

const Hubs = () => {
  const [hubs, setHubs] = useState<Hub[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [hubId, setHubId] = useState('')
  const [kubeconfig, setKubeconfig] = useState('')
  const [namespace, setNamespace] = useState('default')

  useEffect(() => {
    fetchHubs()
  }, [])

  const fetchHubs = async () => {
    try {
      setIsLoading(true)
      const response = await getHubs()
      setHubs(response.items || [])
    } catch (err) {
      console.error('Failed to load hubs:', err)
      setError('Failed to load hubs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateHub = async () => {
    if (!hubId || !kubeconfig || !namespace) {
      setError('Hub ID, Kubeconfig, and Namespace are required')
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      const newHub: Partial<Hub> = {
        id: hubId,
        kubeconfig: kubeconfig,
        namespace: namespace,
      }

      await createHub(newHub)

      // Reset form
      setHubId('')
      setKubeconfig('')
      setNamespace('default')
      setIsCreateModalOpen(false)

      // Refresh list
      await fetchHubs()
    } catch (err: any) {
      console.error('Failed to create hub:', err)
      setError(err.message || 'Failed to create hub')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteHub = async (id: string) => {
    if (!confirm(`Are you sure you want to delete hub "${id}"?`)) {
      return
    }

    try {
      await deleteHub(id)
      await fetchHubs()
    } catch (err) {
      console.error('Failed to delete hub:', err)
      setError('Failed to delete hub')
    }
  }

  const handleKubeconfigFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        // Base64 encode the kubeconfig
        const base64Content = btoa(content)
        setKubeconfig(base64Content)
      }
      reader.readAsText(file)
    }
  }

  return (
    <AppLayout>
      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Title headingLevel="h1" size="2xl">
                Hubs
              </Title>
            </ToolbarItem>
            <ToolbarItem align={{ default: 'alignEnd' }}>
              <Button
                variant="primary"
                icon={<PlusIcon />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Hub
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {error && (
          <Alert
            variant={AlertVariant.danger}
            title={error}
            isInline
            style={{ marginTop: '1rem' }}
            actionClose={<Button variant="plain" onClick={() => setError(null)} />}
          />
        )}

        <div style={{ marginTop: '1rem' }}>
          {isLoading ? (
            <div>Loading hubs...</div>
          ) : hubs.length === 0 ? (
            <div>No hubs found. Click "Add Hub" to create one.</div>
          ) : (
            <Table aria-label="Hubs table" variant="compact">
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Namespace</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {hubs.map((hub) => (
                  <Tr key={hub.id}>
                    <Td>{hub.id}</Td>
                    <Td>{hub.namespace || '-'}</Td>
                    <Td>
                      {hub.metadata?.creation_timestamp
                        ? new Date(hub.metadata.creation_timestamp).toLocaleString()
                        : '-'}
                    </Td>
                    <Td>
                      <Button
                        variant="link"
                        isDanger
                        icon={<TrashIcon />}
                        onClick={() => handleDeleteHub(hub.id)}
                      >
                        Delete
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </PageSection>

      <Modal
        variant={ModalVariant.medium}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        aria-labelledby="create-hub-modal-title"
      >
        <ModalHeader title="Add Hub" labelId="create-hub-modal-title" />
        <ModalBody>
          <Form>
            <FormGroup label="Hub ID" isRequired fieldId="hub-id">
              <TextInput
                isRequired
                type="text"
                id="hub-id"
                name="hub-id"
                value={hubId}
                onChange={(_event, value) => setHubId(value)}
                placeholder="e.g., production-hub"
              />
            </FormGroup>

            <FormGroup label="Namespace" isRequired fieldId="namespace">
              <TextInput
                isRequired
                type="text"
                id="namespace"
                name="namespace"
                value={namespace}
                onChange={(_event, value) => setNamespace(value)}
                placeholder="default"
              />
            </FormGroup>

            <FormGroup label="Kubeconfig" isRequired fieldId="kubeconfig">
              <div style={{ marginBottom: '0.5rem' }}>
                <input
                  type="file"
                  accept=".yaml,.yml,.conf"
                  onChange={handleKubeconfigFileUpload}
                  style={{ marginBottom: '0.5rem' }}
                />
              </div>
              <TextArea
                isRequired
                id="kubeconfig"
                name="kubeconfig"
                value={kubeconfig}
                onChange={(_event, value) => setKubeconfig(value)}
                placeholder="Paste base64-encoded kubeconfig or upload a file"
                rows={10}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6a6e73' }}>
                Upload a kubeconfig file or paste the base64-encoded content
              </div>
            </FormGroup>
          </Form>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateHub}
              isLoading={isCreating}
              isDisabled={!hubId || !namespace || !kubeconfig}
            >
              Create Hub
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </AppLayout>
  )
}

export default Hubs
