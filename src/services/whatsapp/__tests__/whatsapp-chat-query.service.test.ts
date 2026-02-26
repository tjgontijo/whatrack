import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  conversation: {
    findFirst: vi.fn(),
  },
  lead: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { listWhatsAppChatMessages } from '@/services/whatsapp/whatsapp-chat-query.service'

describe('whatsapp-chat-query.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns not found when neither conversation nor lead exists', async () => {
    prismaMock.conversation.findFirst.mockResolvedValueOnce(null)
    prismaMock.lead.findFirst.mockResolvedValueOnce(null)

    const result = await listWhatsAppChatMessages({
      organizationId: 'org-1',
      conversationIdOrLeadId: 'missing-id',
      page: 1,
      pageSize: 50,
    })

    expect(result).toEqual({ error: 'Conversa não encontrada', status: 404 })
  })
})
