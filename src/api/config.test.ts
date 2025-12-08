import { describe, it, expect, vi } from 'vitest'
import type { AppConfig } from './config'

describe('config', () => {
  describe('getConfig', () => {
    it('should fetch and return config successfully', async () => {
      const mockConfig: AppConfig = {
        keycloakUrl: 'https://keycloak.example.com',
        keycloakRealm: 'test-realm',
        oidcClientId: 'test-client',
        fulfillmentApiUrl: 'https://api.example.com',
        namespace: 'test-namespace',
        genericTemplateId: 'template-123',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      })

      // Import fresh module to avoid cache issues
      const { getConfig } = await import('./config')
      const result = await getConfig()

      expect(result).toEqual(mockConfig)
      expect(global.fetch).toHaveBeenCalledWith('/api/config')
    })

    it('should throw error when fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      vi.resetModules()
      const { getConfig } = await import('./config')

      await expect(getConfig()).rejects.toThrow('Failed to fetch config: 404 Not Found')
    })

    it('should throw error when fetch returns error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      vi.resetModules()
      const { getConfig } = await import('./config')

      await expect(getConfig()).rejects.toThrow(
        'Failed to fetch config: 500 Internal Server Error'
      )
    })

    it('should cache config after first fetch', async () => {
      const mockConfig: AppConfig = {
        keycloakUrl: 'https://keycloak.example.com',
        keycloakRealm: 'test-realm',
        oidcClientId: 'test-client',
        fulfillmentApiUrl: 'https://api.example.com',
        namespace: 'test-namespace',
        genericTemplateId: 'template-cache',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      })

      vi.resetModules()
      const { getConfig } = await import('./config')

      await getConfig()
      await getConfig()

      // Should only fetch once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getGenericTemplateId', () => {
    it('should return genericTemplateId from config', async () => {
      const mockConfig: AppConfig = {
        keycloakUrl: 'https://keycloak.example.com',
        keycloakRealm: 'test-realm',
        oidcClientId: 'test-client',
        fulfillmentApiUrl: 'https://api.example.com',
        namespace: 'test-namespace',
        genericTemplateId: 'template-456',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      })

      vi.resetModules()
      const { getGenericTemplateId } = await import('./config')
      const result = await getGenericTemplateId()

      expect(result).toBe('template-456')
    })
  })
})
