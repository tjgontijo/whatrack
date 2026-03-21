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

import {
  attributeInboundMessageToCampaign,
  updateRecipientStatusFromWebhook,
} from '@/services/whatsapp/whatsapp-campaign-attribution.service'

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
        metaWamid: { not: null },
        campaign: {
          organizationId: 'org-1',
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
        status: { in: ['PENDING', 'SENT', 'DELIVERED', 'READ'] },
      },
      orderBy: { createdAt: 'desc' },
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

  it('stores sentAt only when the sent webhook is received', async () => {
    prismaMock.whatsAppCampaignRecipient.findFirst.mockResolvedValue({
      id: 'recipient-2',
      status: 'PENDING',
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      dispatchGroupId: 'group-1',
      campaignId: 'campaign-1',
    })
    prismaMock.whatsAppCampaignRecipient.update.mockResolvedValue({})
    prismaMock.whatsAppCampaignDispatchGroup.findMany.mockResolvedValue([
      { status: 'DELIVERED', metaWamid: 'wamid-2' },
    ])
    prismaMock.whatsAppCampaignDispatchGroup.update.mockResolvedValue({})
    prismaMock.whatsAppCampaign.findMany.mockResolvedValue([{ status: 'COMPLETED' }])
    prismaMock.whatsAppCampaign.update.mockResolvedValue({})

    await updateRecipientStatusFromWebhook({
      wamid: 'wamid-2',
      status: 'sent',
      eventTimestamp: '1774046269',
    })

    const expectedDate = new Date(1774046269 * 1000)
    expect(prismaMock.whatsAppCampaignRecipient.update).toHaveBeenCalledWith({
      where: { id: 'recipient-2' },
      data: {
        status: 'SENT',
        sentAt: expectedDate,
      },
    })
  })

  it('does not backfill sentAt when only the delivered webhook arrives', async () => {
    prismaMock.whatsAppCampaignRecipient.findFirst.mockResolvedValue({
      id: 'recipient-3',
      status: 'PENDING',
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      dispatchGroupId: 'group-1',
      campaignId: 'campaign-1',
    })
    prismaMock.whatsAppCampaignRecipient.update.mockResolvedValue({})
    prismaMock.whatsAppCampaignDispatchGroup.findMany.mockResolvedValue([
      { status: 'DELIVERED', metaWamid: 'wamid-3' },
    ])
    prismaMock.whatsAppCampaignDispatchGroup.update.mockResolvedValue({})
    prismaMock.whatsAppCampaign.findMany.mockResolvedValue([{ status: 'COMPLETED' }])
    prismaMock.whatsAppCampaign.update.mockResolvedValue({})

    await updateRecipientStatusFromWebhook({
      wamid: 'wamid-3',
      status: 'delivered',
      eventTimestamp: '1774046930',
    })

    const expectedDate = new Date(1774046930 * 1000)
    expect(prismaMock.whatsAppCampaignRecipient.update).toHaveBeenCalledWith({
      where: { id: 'recipient-3' },
      data: {
        status: 'DELIVERED',
        deliveredAt: expectedDate,
      },
    })
  })
})
