import { describe, expect, it, vi } from 'vitest'

import { ensureCoreSkillsForOrganization } from '@/services/ai/ai-skill-provisioning.service'

describe('ai-skill-provisioning.service', () => {
  it('upserts both core skills and binds them to all organization agents', async () => {
    const aiSkillUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'skill-factualidade', slug: 'factualidade' })
      .mockResolvedValueOnce({ id: 'skill-calibracao', slug: 'calibracao-confianca' })

    const aiAgentFindMany = vi.fn().mockResolvedValueOnce([{ id: 'agent-1' }, { id: 'agent-2' }])
    const aiAgentSkillUpsert = vi.fn().mockResolvedValue({})

    const prismaClientMock = {
      aiSkill: {
        upsert: aiSkillUpsert,
      },
      aiAgent: {
        findMany: aiAgentFindMany,
      },
      aiAgentSkill: {
        upsert: aiAgentSkillUpsert,
      },
    }

    await ensureCoreSkillsForOrganization(
      prismaClientMock as Parameters<typeof ensureCoreSkillsForOrganization>[0],
      'org-1'
    )

    expect(aiSkillUpsert).toHaveBeenCalledTimes(2)
    expect(aiAgentFindMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      select: { id: true },
    })
    expect(aiAgentSkillUpsert).toHaveBeenCalledTimes(4)
    expect(aiAgentSkillUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          agentId_skillId: {
            agentId: 'agent-1',
            skillId: 'skill-factualidade',
          },
        },
      })
    )
    expect(aiAgentSkillUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          agentId_skillId: {
            agentId: 'agent-2',
            skillId: 'skill-calibracao',
          },
        },
      })
    )
  })
})
