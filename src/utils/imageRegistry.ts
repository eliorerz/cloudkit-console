import { logger } from '@/utils/logger'

export interface OSImage {
  os: string
  displayName: string
  icon: string
  versions: string[]
  repository: string
  osType: string
  available?: boolean
  comingSoon?: boolean
}

// Get full image path for a specific version
export const getImagePath = (repository: string, version: string): string => {
  return `${repository}:${version}`
}

// Fetch all available OS images from the backend API
export const fetchAllOSImages = async (): Promise<OSImage[]> => {
  try {
    const response = await fetch('/api/os-images')

    if (!response.ok) {
      logger.error('Failed to fetch OS images catalog', undefined, { statusText: response.statusText })
      return []
    }

    const data = await response.json()
    return data.images || []
  } catch (error) {
    logger.error('Error fetching OS images', error)
    return []
  }
}
