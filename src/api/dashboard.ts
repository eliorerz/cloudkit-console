import { apiClient } from './client'
import { Cluster, Template, Hub, VirtualMachine, DashboardMetrics, ListResponse } from './types'

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  try {
    const [clustersResp, templatesResp, hubsResp] = await Promise.all([
      apiClient.get<ListResponse<Cluster>>('/clusters'),
      apiClient.get<ListResponse<Template>>('/templates'),
      apiClient.get<ListResponse<Hub>>('/hubs'),
    ])

    const clusters = clustersResp.items || []

    // VMs endpoint returns 404, so we'll handle it separately
    let vms: VirtualMachine[] = []
    try {
      const vmsResp = await apiClient.get<ListResponse<VirtualMachine>>('/vms')
      vms = vmsResp.items || []
    } catch (error) {
      console.log('VMs endpoint not available')
    }

    const activeClusters = clusters.filter(c => c.status === 'Ready' || c.status === 'ready').length
    const runningVMs = vms.filter(vm => vm.status === 'Running' || vm.status === 'running').length

    return {
      clusters: {
        total: clustersResp.total,
        active: activeClusters,
      },
      templates: {
        total: templatesResp.total,
      },
      hubs: {
        total: hubsResp.total,
      },
      vms: {
        total: vms.length,
        running: runningVMs,
      },
    }
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error)
    return {
      clusters: { total: 0, active: 0 },
      templates: { total: 0 },
      hubs: { total: 0 },
      vms: { total: 0, running: 0 },
    }
  }
}
