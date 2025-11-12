import { apiClient } from './client'
import { Cluster, Template, Hub, VirtualMachine, DashboardMetrics, ListResponse } from './types'

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  try {
    const [clustersResp, templatesResp] = await Promise.all([
      apiClient.get<ListResponse<Cluster>>('/clusters'),
      apiClient.get<ListResponse<Template>>('/virtual_machine_templates'),
    ])

    const clusters = clustersResp.items || []

    // Hubs endpoint - handle separately since it may not be implemented yet
    let hubsTotal = 0
    try {
      const hubsResp = await apiClient.get<ListResponse<Hub>>('/host_pools')
      hubsTotal = hubsResp.total
    } catch (error) {
      console.log('Host pools endpoint not available')
    }

    // VMs endpoint - handle separately
    let vms: VirtualMachine[] = []
    try {
      const vmsResp = await apiClient.get<ListResponse<VirtualMachine>>('/virtual_machines')
      vms = vmsResp.items || []
    } catch (error) {
      console.log('VMs endpoint not available')
    }

    // Calculate cluster metrics
    const activeClusters = clusters.filter(c => c.status === 'Ready' || c.status === 'ready').length

    // Calculate VM metrics using status.state
    const runningVMs = vms.filter(vm =>
      vm.status?.state?.toUpperCase() === 'READY'
    ).length
    const failedVMs = vms.filter(vm =>
      vm.status?.state?.toUpperCase() === 'FAILED'
    ).length
    const provisioningVMs = vms.filter(vm =>
      vm.status?.state?.toUpperCase() === 'PROGRESSING'
    ).length

    // Calculate operations from provisioning state
    const activeOperations = provisioningVMs

    return {
      clusters: {
        total: clustersResp.total,
        active: activeClusters,
      },
      templates: {
        total: templatesResp.total,
      },
      hubs: {
        total: hubsTotal,
      },
      vms: {
        total: vms.length,
        running: runningVMs,
        stopped: 0, // Not tracked in PROGRESSING/READY/FAILED states
        error: failedVMs,
        provisioning: provisioningVMs,
      },
      operations: {
        active: activeOperations,
        provisioning: provisioningVMs,
        deprovisioning: 0, // Not available from current API
      },
      recentActivity: {
        vmsCreatedLast24h: 0, // Would need Events API
        vmsCreatedLast7d: 0,  // Would need Events API
      },
      resources: {
        cpuUtilization: 0,    // Not available from current API
        memoryUtilization: 0, // Not available from current API
        storageUtilization: 0, // Not available from current API
      },
    }
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error)
    return {
      clusters: { total: 0, active: 0 },
      templates: { total: 0 },
      hubs: { total: 0 },
      vms: { total: 0, running: 0, stopped: 0, error: 0, provisioning: 0 },
      operations: { active: 0, provisioning: 0, deprovisioning: 0 },
      recentActivity: { vmsCreatedLast24h: 0, vmsCreatedLast7d: 0 },
      resources: { cpuUtilization: 0, memoryUtilization: 0, storageUtilization: 0 },
    }
  }
}
