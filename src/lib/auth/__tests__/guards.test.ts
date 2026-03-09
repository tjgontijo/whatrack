import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getSessionMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/auth', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}))

import { requireAdmin } from '@/lib/auth/guards'

function createRequest() {
  return new NextRequest('http://localhost:3000/api/test')
}

describe('requireAdmin', () => {
  beforeEach(() => {
    getSessionMock.mockReset()
  })

  it('allows admin users', async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: 'user-admin',
        email: 'admin@test.com',
        role: 'admin',
      },
      session: {
        activeOrganizationId: 'org-1',
      },
    })

    const result = await requireAdmin(createRequest())

    expect(result).toMatchObject({
      id: 'user-admin',
      role: 'admin',
      activeOrganizationId: 'org-1',
    })
  })

  it('allows owner users', async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: 'user-owner',
        email: 'owner@test.com',
        role: 'owner',
      },
      session: {
        activeOrganizationId: 'org-1',
      },
    })

    const result = await requireAdmin(createRequest())

    expect(result).toMatchObject({
      id: 'user-owner',
      role: 'owner',
      activeOrganizationId: 'org-1',
    })
  })

  it('rejects regular users', async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: 'user-basic',
        email: 'user@test.com',
        role: 'user',
      },
      session: {
        activeOrganizationId: 'org-1',
      },
    })

    const result = await requireAdmin(createRequest())

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(403)
  })
})
