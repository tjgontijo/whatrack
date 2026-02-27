import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  aiSkill: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { createAiSkill, deleteAiSkill, updateAiSkill } from '@/services/ai/ai-skill.service'

describe('ai-skill.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks updates for SYSTEM skills', async () => {
    prismaMock.aiSkill.findFirst.mockResolvedValueOnce({
      id: 'skill-1',
      source: 'SYSTEM',
    })

    const result = await updateAiSkill('org-1', 'skill-1', {
      name: 'Nova skill',
    })

    expect(result).toEqual({
      error: 'Skills do sistema não podem ser editadas',
      status: 403,
    })
    expect(prismaMock.aiSkill.update).not.toHaveBeenCalled()
  })

  it('creates custom skills with source=CUSTOM', async () => {
    prismaMock.aiSkill.create.mockResolvedValueOnce({
      id: 'skill-1',
      source: 'CUSTOM',
    })

    await createAiSkill('org-1', {
      slug: 'minha-skill',
      name: 'Minha Skill',
      content: 'instruções',
      kind: 'SHARED',
    })

    expect(prismaMock.aiSkill.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        slug: 'minha-skill',
        source: 'CUSTOM',
      }),
      select: expect.any(Object),
    })
  })

  it('deletes custom skills', async () => {
    prismaMock.aiSkill.findFirst.mockResolvedValueOnce({
      id: 'skill-1',
      source: 'CUSTOM',
    })

    const result = await deleteAiSkill('org-1', 'skill-1')

    expect(result).toEqual({ success: true })
    expect(prismaMock.aiSkill.delete).toHaveBeenCalledWith({
      where: { id: 'skill-1' },
    })
  })
})
