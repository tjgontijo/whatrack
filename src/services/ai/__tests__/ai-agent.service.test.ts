import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  aiSkill: {
    findMany: vi.fn(),
  },
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

  it('preserves skill bindings when PATCH omits skillBindings', async () => {
    prismaMock.aiAgent.findFirst.mockResolvedValueOnce({ id: 'agent-1' })
    prismaMock.aiAgent.update.mockResolvedValueOnce({ id: 'agent-1' })

    await updateAiAgent('org-1', 'agent-1', {
      leanPrompt: 'Prompt atualizado',
    })

    expect(prismaMock.aiAgent.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: expect.not.objectContaining({
        skillBindings: expect.anything(),
      }),
      select: expect.any(Object),
    })
    expect(prismaMock.aiSkill.findMany).not.toHaveBeenCalled()
  })
})
