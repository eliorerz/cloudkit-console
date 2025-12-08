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
    rack?: string
    boot_ip?: string
    boot_mac?: string
    bcm_link?: string
    class?: string
    bmc?: {
      url?: string
      user?: string
      password?: string
      insecure?: boolean
    }
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
