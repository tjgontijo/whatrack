import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findUniqueMock,
  upsertMock,
  updateMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
  updateMock: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    aiConversationState: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
      update: updateMock,
    },
  },
}))

import {
  appendInboundMessage,
  clearProcessedMessages,
} from '@/lib/ai/services/ai-conversation-state.service'

describe('aiConversationStateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('appends a new inbound message to the buffer', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 'state-1',
      pendingMessages: [
        {
          messageId: '11111111-1111-4111-8111-111111111111',
          wamid: 'wamid-1',
          body: 'Oi',
          type: 'text',
          direction: 'INBOUND',
          timestamp: '2026-03-23T20:00:00.000Z',
        },
      ],
    })
    upsertMock.mockResolvedValue({})

    const result = await appendInboundMessage({
      organizationId: 'org-1',
      projectId: 'proj-1',
      conversationId: 'conv-1',
      message: {
        messageId: '22222222-2222-4222-8222-222222222222',
        wamid: 'wamid-2',
        body: 'Preciso de ajuda',
        type: 'text',
        direction: 'INBOUND',
        timestamp: '2026-03-23T20:01:00.000Z',
      },
    })

    expect(result.success).toBe(true)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: 'conv-1' },
        update: expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'proj-1',
        }),
      })
    )
  })

  it('does not append the same message twice', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 'state-1',
      pendingMessages: [
        {
          messageId: '11111111-1111-4111-8111-111111111111',
          wamid: 'wamid-1',
          body: 'Oi',
          type: 'text',
          direction: 'INBOUND',
          timestamp: '2026-03-23T20:00:00.000Z',
        },
      ],
    })

    const result = await appendInboundMessage({
      organizationId: 'org-1',
      projectId: 'proj-1',
      conversationId: 'conv-1',
      message: {
        messageId: '11111111-1111-4111-8111-111111111111',
        wamid: 'wamid-1',
        body: 'Oi',
        type: 'text',
        direction: 'INBOUND',
        timestamp: '2026-03-23T20:00:00.000Z',
      },
    })

    expect(result.success).toBe(true)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('clears the buffer only when the fingerprint still matches', async () => {
    const pendingMessages = [
      {
        messageId: '11111111-1111-4111-8111-111111111111',
        wamid: 'wamid-1',
        body: 'Oi',
        type: 'text',
        direction: 'INBOUND',
        timestamp: '2026-03-23T20:00:00.000Z',
      },
    ]
    findUniqueMock.mockResolvedValueOnce({
      id: 'state-1',
      pendingMessages,
    })

    const matchingFingerprint = createHash('sha256')
      .update(JSON.stringify(pendingMessages))
      .digest('hex')

    const result = await clearProcessedMessages({
      conversationId: 'conv-1',
      fingerprint: matchingFingerprint,
    })

    expect(result.success).toBe(true)
    expect(updateMock).toHaveBeenCalledTimes(1)
  })
})
