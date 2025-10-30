export interface Cluster {
  id: string
  title?: string
  status?: string
  metadata?: {
    creation_timestamp?: string
  }
}

export interface Template {
  id: string
  title: string
  description?: string
}

export interface Hub {
  id: string
  title?: string
  status?: string
}

export interface VirtualMachine {
  id: string
  title?: string
  status?: string
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
  }
}
