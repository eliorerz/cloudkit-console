export interface Cluster {
  id: string
  title?: string
  status?: string
  metadata?: {
    creation_timestamp?: string
  }
}

export interface TemplateParameter {
  name: string
  title?: string
  description?: string
  required?: boolean
  type: string
  default?: {
    '@type': string
    value?: any
  }
}

export interface Template {
  id: string
  title: string
  description?: string
  parameters?: TemplateParameter[]
}

export interface Hub {
  id: string
  title?: string
  status?: string
}

export interface VirtualMachine {
  id: string
  metadata?: {
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
    creation_timestamp?: string
  }
  spec?: {
    power_state?: string
  }
  status?: {
    state?: string
    power_state?: string
    host_pool?: string
  }
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
  clusters: {
    total: number
    active: number
  }
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
