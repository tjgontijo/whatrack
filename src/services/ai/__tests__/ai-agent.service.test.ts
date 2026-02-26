import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  aiAgent: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { updateAiAgent } from '@/services/ai/ai-agent.service'

describe('ai-agent.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when agent is not from organization', async () => {
    prismaMock.aiAgent.findFirst.mockResolvedValueOnce(null)

    const result = await updateAiAgent('org-1', 'agent-1', {
      name: 'Agent',
    })

    expect(result).toEqual({ error: 'Agente não encontrado', status: 404 })
  })
})
