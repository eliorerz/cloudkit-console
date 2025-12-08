export interface ClusterTemplate {
  id: string
  title?: string
  description?: string
  metadata?: {
    creation_timestamp?: string
    creators?: string[]
    version?: string
    gpu_type?: string
    gpu_count?: number
    memory_gb?: number
  }
  parameters?: ClusterTemplateParameterDefinition[]
  node_sets?: Record<string, ClusterTemplateNodeSet>
  // UI-specific fields
  version?: string
  architecture?: 'x86' | 'ARM'
  hasGPU?: boolean
  isAdvanced?: boolean
  tags?: string[]
  icon?: 'server' | 'openshift' | 'cube'
  nodeCount?: number
}

export interface ClusterTemplateParameterDefinition {
  name: string
  title?: string
  description?: string
  required?: boolean
  type?: string
  default?: {
    '@type': string
    value?: unknown
  }
}

export interface ClusterTemplateNodeSet {
  host_class?: string
  size?: number
}

export interface Cluster {
  id: string
  metadata?: {
    name?: string
    creation_timestamp?: string
    creators?: string[]
    tenants?: string[]
  }
  spec?: ClusterSpec
  status?: ClusterStatus
}

export interface ClusterSpec {
  template?: string
  template_parameters?: Record<string, unknown>
  node_sets?: Record<string, ClusterNodeSet>
}

export interface ClusterStatus {
  state?: ClusterState
  conditions?: ClusterCondition[]
  api_url?: string
  console_url?: string
  node_sets?: Record<string, ClusterNodeSet>
  hub?: string
}

export enum ClusterState {
  UNSPECIFIED = 'CLUSTER_STATE_UNSPECIFIED',
  PROGRESSING = 'CLUSTER_STATE_PROGRESSING',
  READY = 'CLUSTER_STATE_READY',
  FAILED = 'CLUSTER_STATE_FAILED',
}

export interface ClusterCondition {
  type?: string
  status?: string
  last_transition_time?: string
  reason?: string
  message?: string
}

export interface ClusterNodeSet {
  host_class?: string
  size?: number
  hosts?: string[]
}

export interface ClusterNetworkingMock {
  vlan?: string
  imex_channel?: string
  ib_slot?: string
  nvlink_topology?: string
}
