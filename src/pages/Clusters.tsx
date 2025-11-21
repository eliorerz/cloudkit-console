import { useEffect, useState } from 'react'
import {
  PageSection,
  Title,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Spinner,
  Label,
  Pagination,
  Alert,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
} from '@patternfly/react-core'
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table'
import { CubesIcon } from '@patternfly/react-icons'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layouts/AppLayout'
import { listClusters } from '../api/clustersApi'
import { Cluster, ClusterState } from '../api/types'

const Clusters: React.FC = () => {
  const navigate = useNavigate()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadClusters()
    // Poll every 10s for status updates
    const interval = setInterval(loadClusters, 10000)
    return () => clearInterval(interval)
  }, [page, perPage])

  const loadClusters = async () => {
    try {
      setLoading(true)
      setError(null)
      const offset = (page - 1) * perPage
      const response = await listClusters({ offset, limit: perPage })
      setClusters(response.items || [])
      setTotal(response.total || 0)
    } catch (err: any) {
      console.error('Failed to load clusters:', err)
      setError(err.message || 'Failed to load clusters')
    } finally {
      setLoading(false)
    }
  }

  const getStateBadgeColor = (state?: ClusterState) => {
    switch (state) {
      case ClusterState.READY:
        return 'green'
      case ClusterState.PROGRESSING:
        return 'blue'
      case ClusterState.FAILED:
        return 'red'
      default:
        return 'grey'
    }
  }

  const formatState = (state?: ClusterState) => {
    if (!state) return 'Unknown'
    // Remove CLUSTER_STATE_ prefix and capitalize first letter only
    const cleaned = state.replace('CLUSTER_STATE_', '')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
  }

  if (loading && clusters.length === 0) {
    return (
      <AppLayout>
        <PageSection>
          <Spinner size="xl" />
        </PageSection>
      </AppLayout>
    )
  }

  if (clusters.length === 0 && !loading) {
    return (
      <AppLayout>
        <PageSection>
          <EmptyState>
            <CubesIcon style={{ fontSize: '48px', marginBottom: '1rem' }} />
            <Title headingLevel="h1" size="lg">
              No clusters
            </Title>
            <EmptyStateBody>
              You haven't created any clusters yet. Get started by creating a cluster from a template.
            </EmptyStateBody>
            <EmptyStateActions>
              <Button variant="primary" onClick={() => navigate('/admin/cluster-templates')}>
                Browse Templates
              </Button>
            </EmptyStateActions>
          </EmptyState>
        </PageSection>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          Clusters
        </Title>
      </PageSection>

      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button variant="primary" onClick={() => navigate('/admin/cluster-templates')}>
                Create Cluster
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {error && (
          <Alert variant="danger" title="Error" isInline style={{ marginBottom: '1rem' }}>
            {error}
          </Alert>
        )}

        <Table variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>State</Th>
              <Th>Created At</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {clusters.map((cluster) => (
              <Tr key={cluster.id}>
                <Td>
                  <div style={{ fontWeight: 500 }}>{cluster.metadata?.name || '-'}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    ID: {cluster.id.substring(0, 8)}
                  </div>
                </Td>
                <Td>
                  <Label color={getStateBadgeColor(cluster.status?.state)}>
                    {formatState(cluster.status?.state)}
                  </Label>
                </Td>
                <Td>
                  {cluster.metadata?.creation_timestamp
                    ? new Date(cluster.metadata.creation_timestamp).toLocaleString()
                    : '-'
                  }
                </Td>
                <Td>
                  <Button
                    variant="link"
                    isInline
                    onClick={() => navigate(`/admin/clusters/${cluster.id}`)}
                  >
                    View Details
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        <Pagination
          itemCount={total}
          perPage={perPage}
          page={page}
          onSetPage={(_, newPage) => setPage(newPage)}
          onPerPageSelect={(_, newPerPage) => {
            setPerPage(newPerPage)
            setPage(1)
          }}
          variant="bottom"
          style={{ marginTop: '1rem' }}
        />
      </PageSection>
    </AppLayout>
  )
}

export default Clusters
