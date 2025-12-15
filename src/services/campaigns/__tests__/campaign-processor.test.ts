import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CampaignStatus, MessageStatus, TemplateCategory } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendMetaCloudTemplate } from '@/services/whatsapp/meta-cloud'
import { processCampaign } from '../campaign-processor'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    campaignRecipient: {
      findMany: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/services/whatsapp/meta-cloud', () => ({
  sendMetaCloudTemplate: vi.fn(),
}))

describe('campaign-processor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    process.env.CAMPAIGN_MARKETING_PRICE = '1.00'
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
  })

  it('processa recipients pendentes, marca SENT/FAILED e finaliza campanha', async () => {
    // Campaign context with active credential
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: 'cmp-1',
      organizationId: 'org-1',
      template: {
        id: 'tpl-1',
        name: 'promo',
        language: 'pt_BR',
        category: TemplateCategory.MARKETING,
        components: [],
      },
      totalRecipients: 2,
      actualCost: 0,
      status: CampaignStatus.PROCESSING,
      organization: {
        metaWhatsAppCredential: { isActive: true },
      },
    } as any)

    vi.mocked(prisma.campaignRecipient.findMany)
      .mockResolvedValueOnce([
        { id: 'r1', phone: '5511999999999', variables: {}, status: MessageStatus.PENDING },
        { id: 'r2', phone: '5511888888888', variables: {}, status: MessageStatus.PENDING },
      ] as any)
      .mockResolvedValueOnce([] as any)

    sendMetaCloudTemplate
      .mockResolvedValueOnce({ success: true, messageId: 'mid-1' })
      .mockResolvedValueOnce({ success: false, error: 'fail' })

    vi.mocked(prisma.campaignRecipient.groupBy).mockResolvedValue([
      { status: MessageStatus.SENT, _count: 1 },
      { status: MessageStatus.FAILED, _count: 1 },
      { status: MessageStatus.PENDING, _count: 0 },
      { status: MessageStatus.DELIVERED, _count: 0 },
      { status: MessageStatus.READ, _count: 0 },
    ] as any)

    const promise = processCampaign('cmp-1')
    await vi.runAllTimersAsync()
    await promise

    expect(prisma.campaignRecipient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({
          status: MessageStatus.SENT,
          messageId: 'mid-1',
        }),
      })
    )

    expect(prisma.campaignRecipient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r2' },
        data: expect.objectContaining({
          status: MessageStatus.FAILED,
        }),
      })
    )

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cmp-1' },
        data: expect.objectContaining({
          status: CampaignStatus.FAILED, // há falhas
          completedAt: expect.any(Date),
          actualCost: 200, // 2 x 100 cents (CAMPAIGN_MARKETING_PRICE)
        }),
      })
    )
  })

  it('marca FAILED se credencial estiver inativa', async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: 'cmp-2',
      organizationId: 'org-1',
      template: { category: TemplateCategory.MARKETING },
      status: CampaignStatus.PROCESSING,
      totalRecipients: 0,
      actualCost: 0,
      organization: { metaWhatsAppCredential: null },
    } as any)

    await processCampaign('cmp-2')

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cmp-2' },
        data: expect.objectContaining({
          status: CampaignStatus.FAILED,
        }),
      })
    )
  })
})
