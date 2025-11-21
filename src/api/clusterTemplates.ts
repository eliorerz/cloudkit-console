/**
 * Cluster Templates API
 * Fetches cluster templates from the public/cluster_templates directory
 */

import { ClusterTemplate } from './types'

// List of template files to load
const TEMPLATE_FILES = [
  'simple-openshift-4-20-cluster.json',
  'rhoai-3-0-openshift-4-20-cluster.json',
  'ncp-ai-fabric-gb200-dpu-cluster.json',
  'edge-computing-cluster.json',
  'dev-test-cluster.json',
]

// Helper function to extract version from template
function extractVersion(template: any): string {
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
function getArchitecture(_template: any): 'x86' | 'ARM' {
  // For now, assume all are x86 unless specified otherwise
  // TODO: determine architecture from host_class when needed
  return 'x86'
}

// Helper function to check if template has GPU
function hasGPU(template: any): boolean {
  // Check if host_class contains gb200 or similar GPU indicators
  const hostClasses = template.node_sets ? Object.values(template.node_sets).map((ns: any) => ns.host_class) : []
  return hostClasses.some((hc: string) => hc.toLowerCase().includes('gb200') || hc.toLowerCase().includes('gpu'))
}

// Helper function to determine if template is advanced
function isAdvancedTemplate(template: any): boolean {
  return hasGPU(template) || template.id?.includes('ncp') || template.id?.includes('rhoai')
}

// Helper function to generate tags
function generateTags(template: any): string[] {
  const tags: string[] = []

  if (template.id?.includes('rhoai') || template.description?.toLowerCase().includes('ai/ml')) {
    tags.push('AI/ML')
  }

  if (template.id?.includes('edge')) {
    tags.push('Edge')
  }

  if (template.id?.includes('dev') || template.id?.includes('test')) {
    tags.push('Dev/Test')
  }

  if (template.id?.includes('ncp')) {
    tags.push('HPC')
  }

  if (!tags.length) {
    tags.push('Standard')
  }

  return tags
}

// Helper function to determine icon type
function getIconType(template: any): 'server' | 'openshift' | 'cube' {
  if (template.id?.includes('ncp') || hasGPU(template)) {
    return 'cube'
  }
  if (template.id?.includes('rhoai')) {
    return 'openshift'
  }
  return 'server'
}

// Helper function to get node count
function getNodeCount(template: any): number {
  if (!template.node_sets) return 3
  return Object.values(template.node_sets).reduce((sum: number, ns: any) => sum + (ns.size || 0), 0)
}

/**
 * Get all cluster templates
 */
export async function getClusterTemplates(): Promise<ClusterTemplate[]> {
  const templates: ClusterTemplate[] = []

  for (const filename of TEMPLATE_FILES) {
    try {
      const response = await fetch(`/cluster_templates/${filename}`)
      if (!response.ok) {
        console.error(`Failed to fetch template ${filename}: ${response.statusText}`)
        continue
      }

      const rawTemplate = await response.json()

      // Transform the raw template data to match our ClusterTemplate interface
      const template: ClusterTemplate = {
        id: rawTemplate.id || '',
        title: rawTemplate.title || '',
        description: rawTemplate.description || '',
        metadata: rawTemplate.metadata,
        parameters: rawTemplate.parameters || [],
        node_sets: rawTemplate.node_sets || {},
        // Add computed fields for UI
        version: extractVersion(rawTemplate),
        architecture: getArchitecture(rawTemplate),
        hasGPU: hasGPU(rawTemplate),
        isAdvanced: isAdvancedTemplate(rawTemplate),
        tags: generateTags(rawTemplate),
        icon: getIconType(rawTemplate),
        nodeCount: getNodeCount(rawTemplate),
      }

      templates.push(template)
    } catch (error) {
      console.error(`Error loading template from ${filename}:`, error)
    }
  }

  return templates
}

/**
 * Get a single cluster template by ID
 */
export async function getClusterTemplate(id: string): Promise<ClusterTemplate | null> {
  const templates = await getClusterTemplates()
  return templates.find(t => t.id === id) || null
}
