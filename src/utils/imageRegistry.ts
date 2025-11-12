export interface OSImage {
  os: string
  displayName: string
  icon: string
  versions: string[]
  repository: string
  osType: string
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
      console.error('Failed to fetch OS images catalog:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.images || []
  } catch (error) {
    console.error('Error fetching OS images:', error)
    return []
  }
}
