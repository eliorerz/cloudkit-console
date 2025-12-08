/**
 * Cluster Templates API
 * Fetches cluster templates from the Fulfillment API service
 */

import { ClusterTemplate } from './types'
import { listClusterTemplates as listClusterTemplatesFromAPI } from './clustersApi'
import { getConfig } from './config'
import { logger } from '@/utils/logger'

interface RawTemplate {
  id?: string
  metadata?: {
    version?: string
    gpu_type?: string
  }
  version?: string
  description?: string
  node_sets?: Record<string, { host_class?: string; size?: number }>
}

// Helper function to extract version from template
function extractVersion(template: RawTemplate): string {
  // First, check if version is explicitly set in the template metadata or root
  if (template.metadata?.version) {
    return template.metadata.version
  }
  if (template.version) {
    return template.version
  }

  // Try to extract version from id (e.g., "cloudkit.templates.ocp_4_20_small" -> "4.20")
  const idMatch = template.id?.match(/ocp[_-](\d+)[_-](\d+)/)
  if (idMatch) {
    return `${idMatch[1]}.${idMatch[2]}`
  }

  // Default to 4.20 if not found
  return '4.20'
}

// Helper function to determine architecture based on host_class
function getArchitecture(_template: RawTemplate): 'x86' | 'ARM' {
  // For now, assume all are x86 unless specified otherwise
  // TODO: determine architecture from host_class when needed
  return 'x86'
}

// Helper function to check if template has GPU
function hasGPU(template: RawTemplate): boolean {
  // Check metadata for GPU info
  if (template.metadata?.gpu_type) {
    return true
  }

  // Check if host_class contains GPU indicators
  const hostClasses = template.node_sets ? Object.values(template.node_sets).map(ns => ns.host_class || '') : []
  return hostClasses.some((hc: string) =>
    hc.toLowerCase().includes('gb200') ||
    hc.toLowerCase().includes('h100') ||
    hc.toLowerCase().includes('l40s') ||
    hc.toLowerCase().includes('gpu')
  )
}

// Helper function to determine if template is advanced
function isAdvancedTemplate(template: RawTemplate): boolean {
  return hasGPU(template) || Boolean(template.id?.includes('ncp')) || Boolean(template.id?.includes('rhoai'))
}

// Helper function to generate tags
function generateTags(template: RawTemplate): string[] {
  const tags: string[] = []

  if (template.id?.includes('rhoai') || template.description?.toLowerCase().includes('ai/ml')) {
    tags.push('AI/ML')
  }

  if (template.id?.includes('inference') || template.description?.toLowerCase().includes('inference')) {
    tags.push('Inference')
  }

  if (template.metadata?.gpu_type === 'H100' || template.id?.includes('h100')) {
    tags.push('H100')
  }

  if (template.metadata?.gpu_type === 'L40s' || template.id?.includes('l40s')) {
    tags.push('L40s')
  }

  if (template.id?.includes('edge')) {
    tags.push('Edge')
  }

  if (template.id?.includes('dev') || template.id?.includes('test') || template.id?.includes('low_end')) {
    tags.push('Dev/Test')
  }

  if (template.id?.includes('ncp')) {
    tags.push('HPC')
  }

  if (template.id?.includes('premium')) {
    tags.push('Premium')
  }

  if (!tags.length) {
    tags.push('Standard')
  }

  return tags
}

// Helper function to determine icon type
function getIconType(template: RawTemplate): 'server' | 'openshift' | 'cube' {
  if (template.id?.includes('ncp') || hasGPU(template)) {
    return 'cube'
  }
  if (template.id?.includes('rhoai')) {
    return 'openshift'
  }
  return 'server'
}

// Helper function to get node count
function getNodeCount(template: RawTemplate): number {
  if (!template.node_sets) return 3
  return Object.values(template.node_sets).reduce((sum: number, ns) => sum + (ns.size || 0), 0)
}

/**
 * Get all cluster templates from the Fulfillment API
 */
export async function getClusterTemplates(): Promise<ClusterTemplate[]> {
  try {
    // Fetch templates from the API
    const response = await listClusterTemplatesFromAPI({ limit: 100 })

    // Transform the raw template data to add computed fields for UI
    const templates = (response.items || []).map(rawTemplate => {
      const template: ClusterTemplate = {
        ...rawTemplate,
        // Add computed fields for UI
        version: extractVersion(rawTemplate),
        architecture: getArchitecture(rawTemplate),
        hasGPU: hasGPU(rawTemplate),
        isAdvanced: isAdvancedTemplate(rawTemplate),
        tags: generateTags(rawTemplate),
        icon: getIconType(rawTemplate),
        nodeCount: getNodeCount(rawTemplate),
      }
      return template
    })

    return templates
  } catch (error) {
    logger.error('Error loading cluster templates from API', error)
    return []
  }
}

/**
 * Get a single cluster template by ID
 */
export async function getClusterTemplate(id: string): Promise<ClusterTemplate | null> {
  const templates = await getClusterTemplates()
  return templates.find(t => t.id === id) || null
}

/**
 * Create a new cluster template in the fulfillment service
 */
export async function createClusterTemplate(template: Partial<ClusterTemplate>): Promise<ClusterTemplate> {
  const config = await getConfig()
  const apiBaseUrl = config.fulfillmentApiUrl

  const response = await fetch(`${apiBaseUrl}/api/fulfillment/v1/cluster_templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(template),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create cluster template: ${response.statusText} - ${errorText}`)
  }

  return response.json()
}
