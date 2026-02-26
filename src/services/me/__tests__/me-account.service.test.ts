import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

const auditServiceMock = vi.hoisted(() => ({
  log: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/services/audit/audit.service', () => ({ auditService: auditServiceMock }))

import { updateMeAccount } from '@/services/me/me-account.service'

describe('me-account.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates account and logs audit event', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      name: 'Before Name',
      email: 'before@x.com',
      phone: '5511999999999',
    })
    prismaMock.user.update.mockResolvedValueOnce({
      id: 'user-1',
      name: 'After Name',
      email: 'after@x.com',
      phone: '5511988888888',
      image: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    })

    const result = await updateMeAccount({
      userId: 'user-1',
      organizationId: 'org-1',
      data: {
        name: 'After Name',
        email: 'after@x.com',
        phone: '5511988888888',
      },
    })

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          name: 'After Name',
          email: 'after@x.com',
          phone: '5511988888888',
        }),
      })
    )
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account.updated',
        organizationId: 'org-1',
        userId: 'user-1',
      })
    )
    expect(result.id).toBe('user-1')
  })
})
