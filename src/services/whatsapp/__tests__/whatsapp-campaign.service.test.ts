import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
  },
  whatsAppConfig: {
    findMany: vi.fn(),
  },
  whatsAppCampaign: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  whatsAppCampaignDispatchGroup: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
  },
  whatsAppCampaignRecipient: {
    createManyAndReturn: vi.fn(),
  },
  whatsAppCampaignApproval: {
    create: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/utils/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))

import {
  createCampaign,
  updateCampaign,
  submitForApproval,
  approveCampaign,
  dispatchCampaign,
  cancelCampaign,
} from '@/services/whatsapp/whatsapp-campaign.service'

describe('whatsapp-campaign.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCampaign', () => {
    it('creates campaign when project exists', async () => {
      prismaMock.project.findFirst.mockResolvedValue({ id: 'proj-1' })
      prismaMock.whatsAppConfig.findMany.mockResolvedValue([])
      prismaMock.whatsAppCampaign.create.mockResolvedValue({ id: 'camp-1' })

      const result = await createCampaign('org-1', 'user-1', {
        name: 'Test Campaign',
        projectId: 'proj-1',
      })

      expect(result.success).toBe(true)
      expect(result.data.id).toBe('camp-1')
    })

    it('creates scheduled campaign when scheduledAt is provided', async () => {
      prismaMock.project.findFirst.mockResolvedValue({ id: 'proj-1' })
      prismaMock.whatsAppConfig.findMany.mockResolvedValue([])
      prismaMock.whatsAppCampaign.create.mockResolvedValue({ id: 'camp-1' })

      await createCampaign('org-1', 'user-1', {
        name: 'Scheduled Campaign',
        projectId: 'proj-1',
        scheduledAt: '2026-12-25T10:00:00.000Z',
      })

      expect(prismaMock.whatsAppCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SCHEDULED',
          }),
        })
      )
    })

    it('returns error when project not found', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      const result = await createCampaign('org-1', 'user-1', {
        name: 'Test',
        projectId: 'nonexistent',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Projeto não encontrado')
    })
  })

  describe('updateCampaign', () => {
    it('updates campaign in DRAFT status', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'DRAFT',
      })
      prismaMock.whatsAppCampaign.update.mockResolvedValue({ id: 'camp-1' })

      const result = await updateCampaign('org-1', 'camp-1', { name: 'Updated Name' })

      expect(result.success).toBe(true)
    })

    it('rejects update when not found', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue(null)

      const result = await updateCampaign('org-1', 'nonexistent', { name: 'Test' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Campanha não encontrada')
    })

    it('rejects update when campaign is COMPLETED', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'COMPLETED',
      })

      const result = await updateCampaign('org-1', 'camp-1', { name: 'Test' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Campanha não pode ser editada no estado atual')
    })
  })

  describe('submitForApproval', () => {
    it('submits DRAFT campaign for approval', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'DRAFT',
      })
      prismaMock.whatsAppCampaign.update.mockResolvedValue({})
      prismaMock.whatsAppCampaignApproval.create.mockResolvedValue({})

      const result = await submitForApproval('org-1', 'camp-1', 'user-1')

      expect(result.success).toBe(true)
    })

    it('rejects non-DRAFT campaign', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'PROCESSING',
      })

      const result = await submitForApproval('org-1', 'camp-1', 'user-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('rascunho')
    })
  })

  describe('approveCampaign', () => {
    it('approves PENDING_APPROVAL campaign', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'PENDING_APPROVAL',
      })
      prismaMock.whatsAppCampaign.update.mockResolvedValue({})
      prismaMock.whatsAppCampaignApproval.create.mockResolvedValue({})

      const result = await approveCampaign('org-1', 'camp-1', 'user-1', 'LGTM')

      expect(result.success).toBe(true)
    })

    it('rejects non-PENDING_APPROVAL campaign', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'DRAFT',
      })

      const result = await approveCampaign('org-1', 'camp-1', 'user-1')

      expect(result.success).toBe(false)
    })
  })

  describe('dispatchCampaign', () => {
    it('dispatches draft campaign immediately', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'DRAFT',
        approvedAt: null,
      })
      prismaMock.whatsAppCampaign.update.mockResolvedValue({})
      prismaMock.whatsAppCampaignApproval.create.mockResolvedValue({})

      const result = await dispatchCampaign('org-1', 'camp-1', 'user-1', true)

      expect(result.success).toBe(true)
    })

    it('rejects non-approved campaign', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'PROCESSING',
        approvedAt: new Date(),
      })

      const result = await dispatchCampaign('org-1', 'camp-1', 'user-1', true)

      expect(result.success).toBe(false)
      expect(result.error).toContain('estado atual')
    })

    it('schedules campaign with future date', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'DRAFT',
        approvedAt: null,
      })
      prismaMock.whatsAppCampaign.update.mockResolvedValue({})
      prismaMock.whatsAppCampaignApproval.create.mockResolvedValue({})

      const result = await dispatchCampaign(
        'org-1',
        'camp-1',
        'user-1',
        false,
        new Date('2026-12-25')
      )

      expect(result.success).toBe(true)
    })
  })

  describe('cancelCampaign', () => {
    it('cancels pending campaign', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'PROCESSING',
      })
      prismaMock.whatsAppCampaign.update.mockResolvedValue({})
      prismaMock.whatsAppCampaignDispatchGroup.updateMany.mockResolvedValue({})
      prismaMock.whatsAppCampaignApproval.create.mockResolvedValue({})

      const result = await cancelCampaign('org-1', 'camp-1', 'user-1', 'Canceling for test')

      expect(result.success).toBe(true)
    })

    it('rejects already completed campaign', async () => {
      prismaMock.whatsAppCampaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'COMPLETED',
      })

      const result = await cancelCampaign('org-1', 'camp-1', 'user-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('finalizada')
    })
  })
})
