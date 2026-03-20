import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { buildInvitationQuery, fetchInvitationPreview } from '@/lib/auth/invitation-client'

describe('buildInvitationQuery', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('keeps invitation and next params when they are safe', () => {
    expect(buildInvitationQuery('inv-123', '/acme/projeto-a/billing')).toBe(
      '?invitationId=inv-123&next=%2Facme%2Fprojeto-a%2Fbilling'
    )
  })

  it('supports preserving only the next path', () => {
    expect(buildInvitationQuery(null, '/acme/projeto-a/billing')).toBe(
      '?next=%2Facme%2Fprojeto-a%2Fbilling'
    )
  })

  it('drops unsafe next paths', () => {
    expect(buildInvitationQuery('inv-123', 'https://evil.com')).toBe('?invitationId=inv-123')
  })

  it('loads the public invitation preview through the public API route', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'inv-123',
      email: 'user@test.com',
      role: 'member',
      expiresAt: '2026-03-09T00:00:00.000Z',
      organizationName: 'Org A',
    })

    const preview = await fetchInvitationPreview('inv-123')

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/invitations/inv-123/public')
    expect(preview.organizationName).toBe('Org A')
  })
})
