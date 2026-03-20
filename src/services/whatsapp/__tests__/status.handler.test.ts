import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  whatsAppConfig: {
    findUnique: vi.fn(),
  },
  message: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

const publishToCentrifugoMock = vi.hoisted(() => vi.fn())
const updateRecipientStatusFromWebhookMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/centrifugo/server', () => ({
  publishToCentrifugo: publishToCentrifugoMock,
}))
vi.mock('@/lib/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('@/services/whatsapp/whatsapp-campaign-attribution.service', () => ({
  updateRecipientStatusFromWebhook: updateRecipientStatusFromWebhookMock,
}))

import { statusHandler } from '@/services/whatsapp/handlers/status.handler'

describe('status.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates campaign recipient from webhook even when there is no tracked message record', async () => {
    prismaMock.whatsAppConfig.findUnique.mockResolvedValue({
      id: 'config-1',
      organizationId: 'org-1',
    })
    prismaMock.message.findUnique.mockResolvedValue(null)

    await statusHandler({
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: {
                  phone_number_id: '1036641616191983',
                },
                statuses: [
                  {
                    id: 'wamid-1',
                    status: 'failed',
                    timestamp: '1774041839',
                    errors: [
                      {
                        code: 131042,
                        message: 'Business eligibility payment issue',
                        error_data: {
                          details:
                            'Message failed to send because there were one or more errors related to your payment method.',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    })

    expect(updateRecipientStatusFromWebhookMock).toHaveBeenCalledWith({
      wamid: 'wamid-1',
      status: 'failed',
      eventTimestamp: '1774041839',
      failureReason:
        'Message failed to send because there were one or more errors related to your payment method. (Meta 131042)',
    })
    expect(publishToCentrifugoMock).not.toHaveBeenCalled()
  })
})
