import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  whatsAppCampaignDispatchGroup: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  whatsAppCampaignRecipient: {
    update: vi.fn(),
    findMany: vi.fn(),
  },
  whatsAppCampaign: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

const sendTemplateMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/services/whatsapp/meta-cloud.service', () => ({
  MetaCloudService: { sendTemplate: sendTemplateMock },
}))
vi.mock('@/lib/whatsapp/token-crypto', () => ({
  resolveAccessToken: vi.fn(() => 'resolved-token'),
}))
vi.mock('@/lib/utils/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))

import { processDispatchGroup } from '@/services/whatsapp/whatsapp-campaign-execution.service'

describe('whatsapp-campaign-execution.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps recipients awaiting webhook confirmation after Meta accepts the request', async () => {
    prismaMock.whatsAppCampaignDispatchGroup.findFirst.mockResolvedValue({
      id: 'group-1',
      templateName: 'order_update',
      templateLang: 'pt_BR',
      campaign: { id: 'camp-1', type: 'OPERATIONAL', organizationId: 'org-1' },
      config: {
        id: 'config-1',
        phoneId: 'phone-1',
        accessToken: 'encrypted-token',
        displayPhone: '551148635262',
      },
      recipients: [
        {
          id: 'recipient-1',
          phone: '5511987654321',
          variables: [{ name: 'nome', value: 'Thiago' }],
        },
      ],
    })
    sendTemplateMock.mockResolvedValue({ messages: [{ id: 'wamid-1' }] })
    prismaMock.whatsAppCampaignRecipient.findMany.mockResolvedValue([
      { status: 'PENDING', metaWamid: 'wamid-1' },
    ])

    const result = await processDispatchGroup('group-1', 'org-1')

    expect(result.success).toBe(1)
    expect(result.failed).toBe(0)
    expect(prismaMock.whatsAppCampaignRecipient.update).toHaveBeenCalledWith({
      where: { id: 'recipient-1' },
      data: {
        metaWamid: 'wamid-1',
        sentAt: expect.any(Date),
      },
    })
    expect(prismaMock.whatsAppCampaignDispatchGroup.update).toHaveBeenLastCalledWith({
      where: { id: 'group-1' },
      data: {
        status: 'PROCESSING',
        processedCount: 0,
        successCount: 0,
        failCount: 0,
      },
    })
  })
})
