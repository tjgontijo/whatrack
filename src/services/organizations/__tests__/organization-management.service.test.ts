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
  $transaction: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/services/ai/ai-skill-provisioning.service', () => ({
  ensureCoreSkillsForOrganization: vi.fn(),
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
        documentNumber: '12345678901',
      },
    })

    expect(result).toEqual({
      error: 'Usuário já pertence a uma organização.',
      status: 409,
      organizationId: 'org-1',
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
