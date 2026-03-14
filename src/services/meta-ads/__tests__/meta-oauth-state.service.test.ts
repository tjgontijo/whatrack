import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = vi.hoisted(() => ({
  setex: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/lib/db/redis', () => ({
  getRedis: () => redisMock,
}))

import { createMetaOAuthState, consumeMetaOAuthState } from '@/services/meta-ads/meta-oauth-state.service'

describe('meta-oauth-state.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createMetaOAuthState', () => {
    it('stores oauth state with all required fields including projectId', async () => {
      const payload = {
        organizationId: 'org-1',
        userId: 'user-1',
        projectId: 'proj-1',
      }

      const stateToken = await createMetaOAuthState(payload)

      expect(stateToken).toBeDefined()
      expect(redisMock.setex).toHaveBeenCalledOnce()
      const [key, ttl, data] = redisMock.setex.mock.calls[0]
      expect(key).toMatch(/^oauth_state:/)
      expect(ttl).toBe(600)

      const storedData = JSON.parse(data as string)
      expect(storedData.organizationId).toBe('org-1')
      expect(storedData.userId).toBe('user-1')
      expect(storedData.projectId).toBe('proj-1')
    })

    it('creates state token successfully with projectId', async () => {
      const stateToken = await createMetaOAuthState({
        organizationId: 'org-1',
        userId: 'user-1',
        projectId: 'proj-1',
      })

      expect(stateToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })

  describe('consumeMetaOAuthState', () => {
    it('returns null when state token does not exist', async () => {
      redisMock.get.mockResolvedValueOnce(null)

      const result = await consumeMetaOAuthState('invalid-token')

      expect(result).toBeNull()
    })

    it('returns null when projectId is missing from stored state', async () => {
      redisMock.get.mockResolvedValueOnce(
        JSON.stringify({
          organizationId: 'org-1',
          userId: 'user-1',
          // projectId intentionally missing
        })
      )

      const result = await consumeMetaOAuthState('state-token')

      expect(result).toBeNull()
      expect(redisMock.del).toHaveBeenCalledWith('oauth_state:state-token')
    })

    it('returns null when organizationId is missing', async () => {
      redisMock.get.mockResolvedValueOnce(
        JSON.stringify({
          userId: 'user-1',
          projectId: 'proj-1',
        })
      )

      const result = await consumeMetaOAuthState('state-token')

      expect(result).toBeNull()
    })

    it('returns null when userId is missing', async () => {
      redisMock.get.mockResolvedValueOnce(
        JSON.stringify({
          organizationId: 'org-1',
          projectId: 'proj-1',
        })
      )

      const result = await consumeMetaOAuthState('state-token')

      expect(result).toBeNull()
    })

    it('returns payload when all required fields including projectId are present', async () => {
      redisMock.get.mockResolvedValueOnce(
        JSON.stringify({
          organizationId: 'org-1',
          userId: 'user-1',
          projectId: 'proj-1',
        })
      )

      const result = await consumeMetaOAuthState('state-token')

      expect(result).toEqual({
        organizationId: 'org-1',
        userId: 'user-1',
        projectId: 'proj-1',
      })
      expect(redisMock.del).toHaveBeenCalledWith('oauth_state:state-token')
    })

    it('returns null when stored data is invalid JSON', async () => {
      redisMock.get.mockResolvedValueOnce('invalid json {]')

      const result = await consumeMetaOAuthState('state-token')

      expect(result).toBeNull()
    })
  })
})
