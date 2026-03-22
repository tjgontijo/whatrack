import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  organization: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  member: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  project: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  organizationProfile: {
    upsert: vi.fn(),
  },
  organizationCompany: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const getDefaultTrialBillingPlanMock = vi.hoisted(() => vi.fn())
const startOrganizationTrialMock = vi.hoisted(() => vi.fn())
const ensureSystemRolesForOrganizationMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/services/billing/billing-plan-catalog.service', () => ({
  getDefaultTrialBillingPlan: getDefaultTrialBillingPlanMock,
}))

vi.mock('@/services/billing/billing-subscription.service', () => ({
  startOrganizationTrial: startOrganizationTrialMock,
}))

vi.mock('@/server/organization/organization-rbac.service', () => ({
  ensureSystemRolesForOrganization: ensureSystemRolesForOrganizationMock,
}))

import { completeWelcomeOnboarding } from '@/services/onboarding/welcome-onboarding.service'

describe('completeWelcomeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) =>
      callback(prismaMock)
    )
    getDefaultTrialBillingPlanMock.mockResolvedValue({ slug: 'trial-plan' })
    startOrganizationTrialMock.mockResolvedValue({
      trialEndsAt: new Date('2026-04-04T00:00:00.000Z'),
    })
    ensureSystemRolesForOrganizationMock.mockResolvedValue(undefined)
  })

  it('creates the initial workspace for pessoa fisica without updating the user name', async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce(null)
    prismaMock.organization.findUnique.mockResolvedValueOnce(null)
    prismaMock.organization.create.mockResolvedValueOnce({
      id: 'org-1',
      name: 'Whatrack',
      slug: 'whatrack',
    })
    prismaMock.member.create.mockResolvedValueOnce({})
    prismaMock.organizationProfile.upsert.mockResolvedValueOnce({})
    prismaMock.organizationCompany.deleteMany.mockResolvedValueOnce({ count: 0 })
    prismaMock.project.findFirst.mockResolvedValueOnce(null)
    prismaMock.project.create.mockResolvedValueOnce({
      id: 'project-1',
      name: 'Whatrack',
      slug: 'whatrack',
    })
    prismaMock.organization.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'org-1',
      name: 'Whatrack',
      slug: 'whatrack',
    })

    const result = await completeWelcomeOnboarding({
      user: { id: 'user-1', email: 'owner@whatrack.com', name: 'Owner Name' },
      data: {
        organizationName: 'Whatrack',
        identityType: 'pessoa_fisica',
        documentNumber: '529.982.247-25',
      },
    })

    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(prismaMock.organizationProfile.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      update: {
        cpf: '52998224725',
        onboardingStatus: 'completed',
        onboardingCompletedAt: expect.any(Date),
      },
      create: {
        organizationId: 'org-1',
        cpf: '52998224725',
        onboardingStatus: 'completed',
        onboardingCompletedAt: expect.any(Date),
      },
    })
    expect(prismaMock.organizationCompany.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
    })
    expect(result).toEqual({
      organization: {
        id: 'org-1',
        name: 'Whatrack',
        slug: 'whatrack',
      },
      project: {
        id: 'project-1',
        name: 'Whatrack',
        slug: 'whatrack',
      },
      trialEndsAt: '2026-04-04T00:00:00.000Z',
    })
  })

  it('persists enriched company data when the cnpj lookup succeeds', async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce(null)
    prismaMock.organization.findUnique.mockResolvedValueOnce(null)
    prismaMock.organization.create.mockResolvedValueOnce({
      id: 'org-2',
      name: 'Whatrack',
      slug: 'whatrack',
    })
    prismaMock.member.create.mockResolvedValueOnce({})
    prismaMock.organizationCompany.upsert.mockResolvedValueOnce({})
    prismaMock.organizationProfile.upsert.mockResolvedValueOnce({})
    prismaMock.project.findFirst.mockResolvedValueOnce(null)
    prismaMock.project.create.mockResolvedValueOnce({
      id: 'project-2',
      name: 'Whatrack',
      slug: 'whatrack',
    })
    prismaMock.organization.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'org-2',
      name: 'Whatrack',
      slug: 'whatrack',
    })

    await completeWelcomeOnboarding({
      user: { id: 'user-2', email: 'owner@whatrack.com', name: 'Owner Name' },
      data: {
        organizationName: 'Whatrack',
        identityType: 'pessoa_juridica',
        documentNumber: '11.222.333/0001-81',
        companyLookupData: {
          cnpj: '11222333000181',
          razaoSocial: 'Empresa Exemplo LTDA',
          nomeFantasia: 'Empresa Exemplo',
          cnaeCode: '6201500',
          cnaeDescription: 'Desenvolvimento de software',
          municipio: 'Sao Paulo',
          uf: 'SP',
        },
      },
    })

    expect(prismaMock.organizationCompany.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'org-2' },
      update: expect.objectContaining({
        cnpj: '11222333000181',
        razaoSocial: 'Empresa Exemplo LTDA',
        nomeFantasia: 'Empresa Exemplo',
        cnaeCode: '6201500',
        cnaeDescription: 'Desenvolvimento de software',
        municipio: 'Sao Paulo',
        uf: 'SP',
        authorizedByUserId: 'user-2',
      }),
      create: expect.objectContaining({
        organizationId: 'org-2',
        cnpj: '11222333000181',
        razaoSocial: 'Empresa Exemplo LTDA',
        nomeFantasia: 'Empresa Exemplo',
        cnaeCode: '6201500',
        cnaeDescription: 'Desenvolvimento de software',
        municipio: 'Sao Paulo',
        uf: 'SP',
        authorizedByUserId: 'user-2',
      }),
    })
    expect(prismaMock.organizationProfile.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'org-2' },
      update: {
        cpf: null,
        onboardingStatus: 'completed',
        onboardingCompletedAt: expect.any(Date),
      },
      create: {
        organizationId: 'org-2',
        cpf: null,
        onboardingStatus: 'completed',
        onboardingCompletedAt: expect.any(Date),
      },
    })
  })

  it('falls back to placeholder company data when the cnpj lookup is unavailable', async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce(null)
    prismaMock.organization.findUnique.mockResolvedValueOnce(null)
    prismaMock.organization.create.mockResolvedValueOnce({
      id: 'org-3',
      name: 'Whatrack',
      slug: 'whatrack',
    })
    prismaMock.member.create.mockResolvedValueOnce({})
    prismaMock.organizationCompany.upsert.mockResolvedValueOnce({})
    prismaMock.organizationProfile.upsert.mockResolvedValueOnce({})
    prismaMock.project.findFirst.mockResolvedValueOnce(null)
    prismaMock.project.create.mockResolvedValueOnce({
      id: 'project-3',
      name: 'Whatrack',
      slug: 'whatrack',
    })
    prismaMock.organization.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'org-3',
      name: 'Whatrack',
      slug: 'whatrack',
    })

    await completeWelcomeOnboarding({
      user: { id: 'user-3', email: 'owner@whatrack.com', name: 'Owner Name' },
      data: {
        organizationName: 'Whatrack',
        identityType: 'pessoa_juridica',
        documentNumber: '11.222.333/0001-81',
      },
    })

    expect(prismaMock.organizationCompany.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'org-3' },
      update: {
        cnpj: '11222333000181',
        razaoSocial: 'Whatrack',
        nomeFantasia: 'Whatrack',
      },
      create: {
        organizationId: 'org-3',
        cnpj: '11222333000181',
        razaoSocial: 'Whatrack',
        nomeFantasia: 'Whatrack',
        cnaeCode: '',
        cnaeDescription: '',
        municipio: '',
        uf: '',
        authorizedByUserId: 'user-3',
      },
    })
  })
})
