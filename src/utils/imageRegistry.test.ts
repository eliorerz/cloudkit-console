import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getImagePath, fetchAllOSImages, OSImage } from './imageRegistry'

describe('imageRegistry', () => {
  describe('getImagePath', () => {
    it('should return full image path with version', () => {
      const result = getImagePath('quay.io/example/ubuntu', '22.04')
      expect(result).toBe('quay.io/example/ubuntu:22.04')
    })

    it('should handle repository with trailing slash', () => {
      const result = getImagePath('quay.io/example/centos/', 'stream9')
      expect(result).toBe('quay.io/example/centos/:stream9')
    })

    it('should handle version with special characters', () => {
      const result = getImagePath('registry.io/image', 'v1.0.0-beta')
      expect(result).toBe('registry.io/image:v1.0.0-beta')
    })
  })

  describe('fetchAllOSImages', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('should fetch and return OS images successfully', async () => {
      const mockImages: OSImage[] = [
        {
          os: 'ubuntu',
          displayName: 'Ubuntu',
          icon: 'ubuntu-icon',
          versions: ['22.04', '20.04'],
          repository: 'quay.io/example/ubuntu',
          osType: 'linux',
          available: true
        }
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ images: mockImages })
      })

      const result = await fetchAllOSImages()

      expect(result).toEqual(mockImages)
      expect(global.fetch).toHaveBeenCalledWith('/api/os-images')
    })

    it('should return empty array on fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      })

      const result = await fetchAllOSImages()

      expect(result).toEqual([])
    })

    it('should return empty array on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await fetchAllOSImages()

      expect(result).toEqual([])
    })

    it('should handle empty images array in response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ images: [] })
      })

      const result = await fetchAllOSImages()

      expect(result).toEqual([])
    })

    it('should handle missing images field in response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      const result = await fetchAllOSImages()

      expect(result).toEqual([])
    })

    it('should handle multiple OS images', async () => {
      const mockImages: OSImage[] = [
        {
          os: 'ubuntu',
          displayName: 'Ubuntu',
          icon: 'ubuntu-icon',
          versions: ['22.04'],
          repository: 'quay.io/ubuntu',
          osType: 'linux'
        },
        {
          os: 'centos',
          displayName: 'CentOS Stream',
          icon: 'centos-icon',
          versions: ['9'],
          repository: 'quay.io/centos',
          osType: 'linux',
          comingSoon: true
        }
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ images: mockImages })
      })

      const result = await fetchAllOSImages()

      expect(result).toEqual(mockImages)
      expect(result).toHaveLength(2)
    })
  })
})
