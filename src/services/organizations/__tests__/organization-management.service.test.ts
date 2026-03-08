import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  onboardingStatus: {
    upsert: vi.fn(),
  },
  organization: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  member: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
  organizationProfile: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/services/ai/ai-skill-provisioning.service', () => ({
  ensureCoreSkillsForOrganization: vi.fn(),
}))
vi.mock('@/services/audit/audit.service', () => ({
  auditService: {
    log: vi.fn(),
  },
}))

import {
  createOrganizationFromOnboarding,
  getOrCreateCurrentOrganization,
  updateOrganizationById,
} from '@/services/organizations/organization-management.service'

describe('organization-management.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns conflict when user already has membership', async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce({
      id: 'member-1',
      organizationId: 'org-1',
    })

    const result = await createOrganizationFromOnboarding({
      user: { id: 'user-1', email: 'user@test.com', name: 'User' },
      data: {
        entityType: 'individual',
        fullName: 'User One',
        documentNumber: '12345678901',
        phone: '11987654321',
      },
    })

    expect(result).toEqual({
      error: 'Usuário já pertence a uma organização.',
      status: 409,
      organizationId: 'org-1',
    })
  })

  it('persists the individual full name during onboarding creation', async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce(null)
    prismaMock.$transaction.mockImplementationOnce(async (callback: (tx: typeof prismaMock) => Promise<unknown>) =>
      callback(prismaMock)
    )
    prismaMock.organization.create.mockResolvedValueOnce({
      id: 'org-1',
      name: 'Thiago Alves',
      slug: 'org-1',
    })
    prismaMock.member.create.mockResolvedValueOnce({})
    prismaMock.organizationProfile.create.mockResolvedValueOnce({})
    prismaMock.user.update.mockResolvedValueOnce({})

    const result = await createOrganizationFromOnboarding({
      user: { id: 'user-1', email: 'user@test.com', name: null },
      data: {
        entityType: 'individual',
        fullName: 'Thiago Alves',
        documentNumber: '52998224725',
        phone: '11987654321',
      },
    })

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        name: 'Thiago Alves',
        phone: '11987654321',
      },
    })
    expect(prismaMock.organization.create).toHaveBeenCalledWith({
      data: {
        name: 'Thiago Alves',
        slug: expect.any(String),
        createdAt: expect.any(Date),
      },
    })
    expect(result).toEqual({
      id: 'org-1',
      name: 'Thiago Alves',
      slug: 'org-1',
      entityType: 'individual',
    })
  })

  it('returns current organization when membership already exists', async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce({
      organization: {
        id: 'org-1',
        name: 'Org A',
        slug: 'org-a',
      },
    })

    const result = await getOrCreateCurrentOrganization({
      user: { id: 'user-1', email: 'user@test.com', name: 'User' },
    })

    expect(result).toEqual({
      id: 'org-1',
      name: 'Org A',
      slug: 'org-a',
    })
    expect(prismaMock.organization.create).not.toHaveBeenCalled()
  })

  it('blocks non-owner update when not skip-only update', async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce(null)

    const result = await updateOrganizationById({
      organizationId: 'org-1',
      userId: 'user-1',
      data: {
        name: 'Nova org',
      },
    })

    expect(result).toEqual({
      error: 'Você não tem permissão para atualizar esta organização',
      status: 403,
    })
  })
})
