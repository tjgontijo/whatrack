import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findFirstMock,
  infoMock,
  errorMock,
  generateMock,
  getMastraAgentBySlugMock,
} = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  infoMock: vi.fn(),
  errorMock: vi.fn(),
  generateMock: vi.fn(),
  getMastraAgentBySlugMock: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    aiAgentProjectConfig: {
      findFirst: findFirstMock,
    },
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: infoMock,
    error: errorMock,
  },
}))

vi.mock('@/server/mastra/agents', () => ({
  getMastraAgentBySlug: getMastraAgentBySlugMock,
}))

import { executePrompt } from '@/lib/ai/services/execute-prompt'

describe('executePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails when the agent slug is unknown', async () => {
    getMastraAgentBySlugMock.mockReturnValue(null)

    const result = await executePrompt({
      organizationId: 'org-1',
      projectId: 'project-1',
      agentSlug: 'unknown-agent',
      prompt: 'hello',
    })

    expect(result).toEqual({
      success: false,
      error: 'Unknown AI agent slug: unknown-agent',
    })
  })

  it('returns structured execution output on success', async () => {
    getMastraAgentBySlugMock.mockReturnValue({
      generate: generateMock,
    })
    findFirstMock.mockResolvedValue(null)
    generateMock.mockResolvedValue({
      text: 'Prompt response',
      finishReason: 'stop',
      response: {
        modelId: 'openai/gpt-4o-mini',
      },
      totalUsage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
      usage: {
        inputTokens: 10,
        outputTokens: 20,
      },
      runId: 'run-1',
      traceId: 'trace-1',
    })

    const result = await executePrompt({
      organizationId: 'org-1',
      projectId: 'project-1',
      agentSlug: 'whatsapp-inbound',
      prompt: 'hello',
    })

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.text).toBe('Prompt response')
      expect(result.data.modelId).toBe('openai/gpt-4o-mini')
      expect(result.data.totalTokens).toBe(30)
    }
  })
})
