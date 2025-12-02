// ============================================
// Cluster as a Service (CaaS) Types
// ============================================

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
    value?: any
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
  template_parameters?: Record<string, any>
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
}

export interface ClusterNetworkingMock {
  vlan?: string
  imex_channel?: string
  ib_slot?: string
  nvlink_topology?: string
}

// ============================================
// Virtual Machine Types
// ============================================

export interface TemplateParameter {
  name: string
  title?: string
  description?: string
  required?: boolean
  type?: string
  default?: {
    '@type': string
    value?: any
  }
}

export interface Template {
  id: string
  title: string
  description?: string
  metadata?: {
    creation_timestamp?: string
    creators?: string[]
  }
  parameters?: TemplateParameter[]
}

export interface Hub {
  id: string
  metadata?: {
    creation_timestamp?: string
  }
  kubeconfig?: string
  namespace?: string
}

export interface VirtualMachine {
  id: string
  metadata?: {
    name?: string
    creation_timestamp?: string
    creators?: string[]
  }
  spec?: {
    template?: string
    template_parameters?: Record<string, any>
  }
  status?: {
    state?: string
    conditions?: VirtualMachineCondition[]
    ip_address?: string
    hub?: string
  }
}

export interface VirtualMachineCondition {
  type?: string
  status?: string
  last_transition_time?: string
  reason?: string
  message?: string
}

export enum VirtualMachineState {
  UNSPECIFIED = 'VIRTUAL_MACHINE_STATE_UNSPECIFIED',
  PROGRESSING = 'VIRTUAL_MACHINE_STATE_PROGRESSING',
  READY = 'VIRTUAL_MACHINE_STATE_READY',
  FAILED = 'VIRTUAL_MACHINE_STATE_FAILED',
}

export interface Host {
  id: string
  metadata?: {
    name?: string
    creation_timestamp?: string
    creators?: string[]
    tenants?: string[]
  }
  spec?: {
    power_state?: string
  }
  status?: {
    state?: string
    power_state?: string
    conditions?: HostCondition[]
    host_pool?: string
    cluster?: string
  }
}

export interface HostCondition {
  type?: string
  status?: string
  last_transition_time?: string
  reason?: string
  message?: string
}

export interface HostPool {
  id: string
  metadata?: {
    creation_timestamp?: string
  }
  spec?: {
    host_sets?: Record<string, { host_class?: string; size?: number }>
  }
  status?: {
    state?: string
    hosts?: string[]
    hub?: string
    host_sets?: Record<string, { host_class?: string; size?: number }>
  }
}

export interface ListResponse<T> {
  size: number
  total: number
  items?: T[]
}

export interface DashboardMetrics {
  templates: {
    total: number
  }
  hubs: {
    total: number
  }
  vms: {
    total: number
    running: number
    stopped: number
    error: number
    provisioning: number
  }
  operations: {
    active: number
    provisioning: number
    deprovisioning: number
  }
  recentActivity: {
    vmsCreatedLast24h: number
    vmsCreatedLast7d: number
  }
  resources: {
    cpuUtilization: number
    memoryUtilization: number
    storageUtilization: number
  }
}
