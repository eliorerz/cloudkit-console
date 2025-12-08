import { apiClient } from './client'
import { getHubs } from './hubs'
import { Template, VirtualMachine, DashboardMetrics, ListResponse } from './types'
import { deduplicateRequest } from '../utils/requestDeduplication'
import { logger } from '@/utils/logger'

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  return deduplicateRequest('dashboard-metrics', async () => {
  try {
    const templatesResp = await apiClient.get<ListResponse<Template>>('/virtual_machine_templates')

    // Hubs - use gRPC-Web client to fetch from private.v1.Hubs
    let hubsTotal = 0
    try {
      const hubsResp = await getHubs()
      hubsTotal = hubsResp.total || (hubsResp.items?.length ?? 0)
    } catch (error) {
      logger.info('Hubs endpoint not available', { error })
    }

    // VMs endpoint - handle separately
    let vms: VirtualMachine[] = []
    try {
      const vmsResp = await apiClient.get<ListResponse<VirtualMachine>>('/virtual_machines')
      vms = vmsResp.items || []
    } catch (error) {
      logger.info('VMs endpoint not available')
    }

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
    logger.error('Failed to fetch dashboard metrics', error)
    return {
      templates: { total: 0 },
      hubs: { total: 0 },
      vms: { total: 0, running: 0, stopped: 0, error: 0, provisioning: 0 },
      operations: { active: 0, provisioning: 0, deprovisioning: 0 },
      recentActivity: { vmsCreatedLast24h: 0, vmsCreatedLast7d: 0 },
      resources: { cpuUtilization: 0, memoryUtilization: 0, storageUtilization: 0 },
    }
  }
  })
}
