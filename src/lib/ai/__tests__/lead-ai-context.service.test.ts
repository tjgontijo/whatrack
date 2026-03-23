import { beforeEach, describe, expect, it, vi } from 'vitest'

const { leadFindUniqueMock, leadAiContextUpsertMock, leadAiContextUpdateMock } =
  vi.hoisted(() => ({
    leadFindUniqueMock: vi.fn(),
    leadAiContextUpsertMock: vi.fn(),
    leadAiContextUpdateMock: vi.fn(),
  }))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    lead: {
      findUnique: leadFindUniqueMock,
    },
    leadAiContext: {
      upsert: leadAiContextUpsertMock,
      update: leadAiContextUpdateMock,
    },
  },
}))

import { ensureContext } from '@/lib/ai/services/lead-ai-context.service'

describe('leadAiContextService.ensureContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates or syncs a project-aware context from the lead record', async () => {
    leadFindUniqueMock.mockResolvedValue({
      id: 'lead-1',
      organizationId: 'org-1',
      projectId: 'project-1',
      name: 'Lead A',
      mail: 'lead@example.com',
      phone: '5511999999999',
      waId: '5511999999999',
      pushName: 'Lead A',
    })
    leadAiContextUpsertMock.mockResolvedValue({
      id: 'ctx-1',
      organizationId: 'org-1',
      projectId: 'project-1',
      leadId: 'lead-1',
    })

    const result = await ensureContext('lead-1')

    expect(leadAiContextUpsertMock).toHaveBeenCalledWith({
      where: { leadId: 'lead-1' },
      update: {
        organizationId: 'org-1',
        projectId: 'project-1',
      },
      create: {
        leadId: 'lead-1',
        organizationId: 'org-1',
        projectId: 'project-1',
      },
    })
    expect(result.success).toBe(true)
  })
})
