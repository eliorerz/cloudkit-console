export interface Hub {
  id: string
  metadata?: {
    creation_timestamp?: string
    name?: string
    creators?: string[]
    tenants?: string[]
    finalizers?: string[]
  }
  kubeconfig?: string
  namespace?: string
  ip?: string
  pull_secret?: string
  ssh_public_key?: string
}

export interface Tenant {
  id: string
  metadata?: {
    name?: string
    creation_timestamp?: string
    tenants?: string[]
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
