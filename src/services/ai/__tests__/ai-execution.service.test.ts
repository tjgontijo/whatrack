import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  aiAgent: {
    findMany: vi.fn(),
  },
  ticket: {
    findUnique: vi.fn(),
  },
  aiInsight: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}))

const publishToCentrifugoMock = vi.hoisted(() => vi.fn())
const openaiMock = vi.hoisted(() => vi.fn((model: string) => `openai:${model}`))
const groqMock = vi.hoisted(() => vi.fn((model: string) => `groq:${model}`))
const agentGenerateMock = vi.hoisted(() => vi.fn())
const agentCtorMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/centrifugo/server', () => ({
  publishToCentrifugo: publishToCentrifugoMock,
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: openaiMock,
}))

vi.mock('@ai-sdk/groq', () => ({
  groq: groqMock,
}))

vi.mock('@mastra/core/agent', () => ({
  Agent: class AgentMock {
    constructor(...args: unknown[]) {
      agentCtorMock(...args)
    }

    generate(...args: unknown[]) {
      return agentGenerateMock(...args)
    }
  },
}))

import { dispatchAiEvent } from '@/services/ai/ai-execution.service'

describe('ai-execution.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('composes instructions with leanPrompt + ordered skills and creates insight', async () => {
    prismaMock.aiAgent.findMany.mockResolvedValueOnce([
      {
        id: 'agent-1',
        name: 'Detector',
        leanPrompt: 'Lean prompt',
        model: 'openai/gpt-4o-mini',
        schemaFields: [
          {
            fieldName: 'intent',
            fieldType: 'STRING',
            description: 'Intent',
            isRequired: true,
            options: null,
          },
        ],
        skillBindings: [
          { skill: { content: 'Skill A' } },
          { skill: { content: 'Skill B' } },
        ],
      },
    ])

    prismaMock.ticket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      organizationId: 'org-1',
      conversation: {
        messages: [
          { direction: 'OUTBOUND', body: 'Oi, tudo bem?' },
          { direction: 'INBOUND', body: 'Quero fechar hoje' },
        ],
      },
    })

    prismaMock.aiInsight.findFirst.mockResolvedValueOnce(null)
    agentGenerateMock.mockResolvedValueOnce({
      object: {
        intent: 'SALE',
      },
    })
    prismaMock.aiInsight.create.mockResolvedValueOnce({
      id: 'insight-1',
      payload: { intent: 'SALE' },
    })

    const executedCount = await dispatchAiEvent('CONVERSATION_IDLE_3M', 'ticket-1', 'org-1')

    expect(executedCount).toBe(1)
    expect(prismaMock.aiAgent.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        isActive: true,
        triggers: { some: { eventType: 'CONVERSATION_IDLE_3M' } },
      },
      select: expect.objectContaining({
        skillBindings: {
          where: {
            isActive: true,
            skill: { isActive: true },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            skill: {
              select: {
                content: true,
              },
            },
          },
        },
      }),
    })
    expect(openaiMock).toHaveBeenCalledWith('gpt-4o-mini')
    expect(agentCtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: 'Lean prompt\n\nSkill A\n\nSkill B',
      })
    )
    expect(prismaMock.aiInsight.create).toHaveBeenCalledTimes(1)
    expect(publishToCentrifugoMock).toHaveBeenCalledTimes(1)
  })

  it('skips insight creation when model output is neutral', async () => {
    prismaMock.aiAgent.findMany.mockResolvedValueOnce([
      {
        id: 'agent-1',
        name: 'Qualificador',
        leanPrompt: 'Lean prompt',
        model: 'openai/gpt-4o-mini',
        schemaFields: [
          {
            fieldName: 'temperature',
            fieldType: 'STRING',
            description: 'Temperature',
            isRequired: true,
            options: null,
          },
        ],
        skillBindings: [],
      },
    ])

    prismaMock.ticket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      organizationId: 'org-1',
      conversation: {
        messages: [{ direction: 'INBOUND', body: 'Só queria tirar uma dúvida' }],
      },
    })

    prismaMock.aiInsight.findFirst.mockResolvedValueOnce(null)
    agentGenerateMock.mockResolvedValueOnce({
      object: {
        temperature: 'NEUTRAL',
      },
    })

    const executedCount = await dispatchAiEvent('CONVERSATION_IDLE_3M', 'ticket-1', 'org-1')

    expect(executedCount).toBe(0)
    expect(prismaMock.aiInsight.create).not.toHaveBeenCalled()
    expect(publishToCentrifugoMock).not.toHaveBeenCalled()
  })

  it('skips execution when there is an insight in the 2h debounce window', async () => {
    prismaMock.aiAgent.findMany.mockResolvedValueOnce([
      {
        id: 'agent-1',
        name: 'Resumidor',
        leanPrompt: 'Lean prompt',
        model: 'openai/gpt-4o-mini',
        schemaFields: [
          {
            fieldName: 'summary',
            fieldType: 'STRING',
            description: 'Summary',
            isRequired: true,
            options: null,
          },
        ],
        skillBindings: [],
      },
    ])

    prismaMock.ticket.findUnique.mockResolvedValueOnce({
      id: 'ticket-1',
      organizationId: 'org-1',
      conversation: {
        messages: [{ direction: 'INBOUND', body: 'Encerramos por aqui' }],
      },
    })

    prismaMock.aiInsight.findFirst.mockResolvedValueOnce({ id: 'insight-existing' })

    const executedCount = await dispatchAiEvent('TICKET_CLOSED', 'ticket-1', 'org-1')

    expect(executedCount).toBe(0)
    expect(agentCtorMock).not.toHaveBeenCalled()
    expect(prismaMock.aiInsight.create).not.toHaveBeenCalled()
  })
})
