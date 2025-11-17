export interface OSImage {
  os: string
  displayName: string
  icon: string
  repository: string
  versions: string[]
  osType: string
  available?: boolean
  comingSoon?: boolean
}

export interface OSImagesResponse {
  images: OSImage[]
}

export async function getOSImages(): Promise<OSImagesResponse> {
  const response = await fetch('/api/os-images')
  if (!response.ok) {
    throw new Error('Failed to fetch OS images')
  }
  return response.json()
}
