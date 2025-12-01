export interface CPUSpec {
  type: string
  cores: number
  sockets: number
  threadsPerCore: number
}

export interface RAMSpec {
  size: string
  type: string
}

export interface DiskSpec {
  type: string
  size: string
  interface: string
}

export interface GPUSpec {
  model?: string
  count?: number
  memory?: string
}

export interface HostClass {
  name: string
  description: string
  category: string
  cpu: CPUSpec
  ram: RAMSpec
  disk: DiskSpec
  gpu: GPUSpec | null
}

export interface HostClassesResponse {
  [key: string]: HostClass
}

export async function getHostClasses(): Promise<HostClassesResponse> {
  const response = await fetch('/api/host-classes')
  if (!response.ok) {
    throw new Error('Failed to fetch host classes')
  }
  return response.json()
}
