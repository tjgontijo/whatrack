import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  whatsAppCampaignRecipient: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  message: {
    update: vi.fn(),
  },
  whatsAppCampaignDispatchGroup: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  whatsAppCampaign: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/utils/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))

import { attributeInboundMessageToCampaign } from '@/services/whatsapp/whatsapp-campaign-attribution.service'

describe('whatsapp-campaign-attribution.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores the original inbound timestamp when attributing a campaign response', async () => {
    const messageTimestamp = new Date('2026-03-20T22:15:30.000Z')

    prismaMock.whatsAppCampaignRecipient.findFirst.mockResolvedValue({
      id: 'recipient-1',
      campaignId: 'campaign-1',
    })
    prismaMock.whatsAppCampaignRecipient.update.mockResolvedValue({})
    prismaMock.message.update.mockResolvedValue({})

    await attributeInboundMessageToCampaign({
      phone: '5511987654321',
      organizationId: 'org-1',
      messageId: 'message-1',
      leadId: 'lead-1',
      messageTimestamp,
    })

    expect(prismaMock.whatsAppCampaignRecipient.findFirst).toHaveBeenCalledWith({
      where: {
        normalizedPhone: '5511987654321',
        campaign: {
          organizationId: 'org-1',
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
        status: { in: ['SENT', 'DELIVERED', 'READ'] },
      },
      select: { id: true, campaignId: true },
    })
    expect(prismaMock.whatsAppCampaignRecipient.update).toHaveBeenCalledWith({
      where: { id: 'recipient-1' },
      data: {
        status: 'RESPONDED',
        respondedAt: messageTimestamp,
        leadId: 'lead-1',
      },
    })
  })
})
