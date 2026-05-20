import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { getLaunchpadState, isLaunchpadComplete } from './get-launchpad-state'
import * as billingService from '@/features/billing/services/billing-subscription.service'

vi.mock('@/features/billing/services/billing-subscription.service', () => ({
  getActiveSubscription: vi.fn(),
}))

describe('launchpad.service (Integration)', () => {
  let orgId: string
  let projectId: string

  beforeEach(async () => {
    // 1. Create Organization & Project
    const org = await prisma.organization.create({
      data: {
        name: 'Minha Organização',
        slug: `launchpad-org-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    orgId = org.id

    const project = await prisma.project.create({
      data: {
        organization: { connect: { id: orgId } },
        name: 'Launchpad Project',
        slug: `launchpad-project-${Math.random().toString(36).substring(2, 9)}`,
      },
    })
    projectId = project.id

    vi.mocked(billingService.getActiveSubscription).mockResolvedValue(null)
  })

  afterEach(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
    }
  })

  it('returns all items as incomplete for a new organization', async () => {
    const items = await getLaunchpadState(orgId, projectId)
    expect(items.every(i => !i.completed)).toBe(true)
    
    const complete = await isLaunchpadComplete(orgId, projectId)
    expect(complete).toBe(false)
  })

  it('marks items as completed when corresponding records exist', async () => {
    // 1. Rename organization
    await prisma.organization.update({
      where: { id: orgId },
      data: { name: 'Whatrack HQ' },
    })

    // 2. Add WhatsApp config
    await prisma.whatsAppConfig.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        status: 'connected',
      },
    })

    // 3. Add Meta connection
    await prisma.metaConnection.create({
      data: {
        organization: { connect: { id: orgId } },
        project: { connect: { id: projectId } },
        fbUserId: '123',
        fbUserName: 'Test User',
        accessToken: 'token',
        tokenExpiresAt: new Date(Date.now() + 100000),
        status: 'ACTIVE',
      },
    })

    // 4. Add deal stage
    await prisma.dealStage.create({
      data: {
        organization: { connect: { id: orgId } },
        projectId,
        name: 'Stage 1',
        order: 0,
        color: '#000',
      },
    })

    // 5. Add fiscal data (profile with cpf)
    await prisma.organizationProfile.create({
      data: {
        organization: { connect: { id: orgId } },
        cpf: '12345678901',
      },
    })

    // 6. Mock active subscription
    vi.mocked(billingService.getActiveSubscription).mockResolvedValue({ id: 'sub_123' } as any)

    const items = await getLaunchpadState(orgId, projectId)
    expect(items.every(i => i.completed)).toBe(true)

    const complete = await isLaunchpadComplete(orgId, projectId)
    expect(complete).toBe(true)
  })

  it('marks fiscal data as completed if company with cnpj exists', async () => {
    // Add company instead of profile
    await prisma.organizationCompany.create({
      data: {
        organization: { connect: { id: orgId } },
        cnpj: '00000000000191',
        razaoSocial: 'Test SA',
        cnaeCode: '0000',
        cnaeDescription: 'Desc',
        municipio: 'City',
        uf: 'SP',
        authorizedByUserId: '00000000-0000-0000-0000-000000000001', // random uuid
      },
    })

    const items = await getLaunchpadState(orgId, projectId)
    const fiscalItem = items.find(i => i.id === 'fiscal-data')
    expect(fiscalItem?.completed).toBe(true)
  })
})
