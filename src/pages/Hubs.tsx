import { useState, useEffect } from 'react'
import {
  PageSection,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Button,
  Alert,
  AlertVariant,
  Tooltip,
} from '@patternfly/react-core'
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table'
import { PlusIcon } from '@patternfly/react-icons'
import AppLayout from '../components/layouts/AppLayout'
import { getHubs } from '../api/hubs'
import { Hub } from '../api/types'

const Hubs = () => {
  const [hubs, setHubs] = useState<Hub[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHubs()
  }, [])

  const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return '-'

    try {
      const date = new Date(timestamp)
      // Check if date is valid and not Unix epoch (1970-01-01)
      if (isNaN(date.getTime()) || date.getFullYear() === 1970) {
        return '-'
      }
      return date.toLocaleString()
    } catch {
      return '-'
    }
  }

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
              <Tooltip content="Not supported yet">
                <Button
                  variant="secondary"
                  icon={<PlusIcon />}
                  isDisabled
                >
                  Add Hub
                </Button>
              </Tooltip>
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
                </Tr>
              </Thead>
              <Tbody>
                {hubs.map((hub) => (
                  <Tr key={hub.id}>
                    <Td>{hub.id}</Td>
                    <Td>{hub.namespace || '-'}</Td>
                    <Td>{formatTimestamp(hub.metadata?.creation_timestamp)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </PageSection>
    </AppLayout>
  )
}

export default Hubs
