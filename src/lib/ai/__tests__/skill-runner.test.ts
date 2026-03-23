import { beforeEach, describe, expect, it, vi } from 'vitest'

const { skillFindFirstMock, executePromptMock } = vi.hoisted(() => ({
  skillFindFirstMock: vi.fn(),
  executePromptMock: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    aiSkill: {
      findFirst: skillFindFirstMock,
    },
  },
}))

vi.mock('@/lib/ai/services/execute-prompt', () => ({
  executePrompt: executePromptMock,
}))

import { runSkill } from '@/lib/ai/services/skill-runner'

const baseContext = {
  organizationId: 'org-1',
  projectId: 'proj-1',
  leadId: 'lead-1',
  ticketId: 'ticket-1',
  pendingMessages: [{ body: 'Quais são os valores?' }],
  lead: {
    name: 'Thiago',
    pushName: 'Thiago',
    phone: '+5511999999999',
    waId: '5511999999999',
  },
  projectConfig: {
    businessName: 'Agência X',
    productDescription: 'Consultoria especializada em lançamentos.',
    pricingInfo: 'Nosso plano inicial começa em R$ 1.500 por mês.',
    nextStepType: 'agendar diagnóstico',
    assistantName: 'Clara',
    escalationContact: 'telefone comercial',
    businessHours: {
      timezone: 'America/Sao_Paulo',
      schedules: [{ day: 1, open: '09:00', close: '18:00' }],
    },
  },
} as const

describe('skillRunner.runSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes deterministic skills without calling the LLM', async () => {
    skillFindFirstMock.mockResolvedValue({
      id: 'skill-1',
      slug: 'send-pricing',
      versions: [
        {
          version: '1.0.0',
          mode: 'deterministic',
          prompt: 'unused',
        },
      ],
    })

    const result = await runSkill({
      skillSlug: 'send-pricing',
      context: baseContext,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.text).toContain('R$ 1.500')
      expect(result.data.resolvedSkillSlug).toBe('send-pricing')
    }
    expect(executePromptMock).not.toHaveBeenCalled()
  })

  it('executes llm skills via executePrompt', async () => {
    skillFindFirstMock.mockResolvedValue({
      id: 'skill-2',
      slug: 'explain-product-service',
      versions: [
        {
          version: '1.0.0',
          mode: 'llm',
          prompt: 'Explique o serviço',
        },
      ],
    })
    executePromptMock.mockResolvedValue({
      success: true,
      data: {
        text: 'Nós ajudamos sua empresa a estruturar lançamentos com processo comercial e operação.',
      },
    })

    const result = await runSkill({
      skillSlug: 'explain-product-service',
      context: baseContext,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.text).toContain('estruturar lançamentos')
      expect(result.data.skillVersion).toBe('1.0.0')
    }
    expect(executePromptMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to human-handoff when the target skill is missing', async () => {
    skillFindFirstMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'skill-3',
        slug: 'human-handoff',
        versions: [
          {
            version: '1.0.0',
            mode: 'deterministic',
            prompt: 'unused',
          },
        ],
      })

    const result = await runSkill({
      skillSlug: 'unknown-skill',
      context: baseContext,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.resolvedSkillSlug).toBe('human-handoff')
      expect(result.data.text).toContain('direcionar seu atendimento')
    }
  })
})
