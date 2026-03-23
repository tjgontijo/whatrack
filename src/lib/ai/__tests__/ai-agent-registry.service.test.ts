import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  agentFindUniqueMock,
  agentFindManyMock,
  projectFindUniqueMock,
  configFindUniqueMock,
  configUpsertMock,
} = vi.hoisted(() => ({
  agentFindUniqueMock: vi.fn(),
  agentFindManyMock: vi.fn(),
  projectFindUniqueMock: vi.fn(),
  configFindUniqueMock: vi.fn(),
  configUpsertMock: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    aiAgent: {
      findUnique: agentFindUniqueMock,
      findMany: agentFindManyMock,
    },
    project: { findUnique: projectFindUniqueMock },
    aiAgentProjectConfig: {
      findUnique: configFindUniqueMock,
      upsert: configUpsertMock,
    },
  },
}))

import {
  isAgentEnabled,
  provisionDefaults,
  getProjectConfig,
} from '@/lib/ai/services/ai-agent-registry.service'

describe('aiAgentRegistryService.isAgentEnabled', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns false when no config exists for the project', async () => {
    agentFindUniqueMock.mockResolvedValue({ id: 'agent-1', slug: 'whatsapp-inbound' })
    configFindUniqueMock.mockResolvedValue(null)

    const result = await isAgentEnabled('whatsapp-inbound', 'proj-1')

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe(false)
  })

  it('returns false when config exists but enabled is false', async () => {
    agentFindUniqueMock.mockResolvedValue({ id: 'agent-1', slug: 'whatsapp-inbound' })
    configFindUniqueMock.mockResolvedValue({ enabled: false, paused: false })

    const result = await isAgentEnabled('whatsapp-inbound', 'proj-1')

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe(false)
  })

  it('returns false when agent is paused', async () => {
    agentFindUniqueMock.mockResolvedValue({ id: 'agent-1', slug: 'whatsapp-inbound' })
    configFindUniqueMock.mockResolvedValue({ enabled: true, paused: true })

    const result = await isAgentEnabled('whatsapp-inbound', 'proj-1')

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe(false)
  })

  it('returns true when enabled and not paused', async () => {
    agentFindUniqueMock.mockResolvedValue({ id: 'agent-1', slug: 'whatsapp-inbound' })
    configFindUniqueMock.mockResolvedValue({ enabled: true, paused: false })

    const result = await isAgentEnabled('whatsapp-inbound', 'proj-1')

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe(true)
  })

  it('fails when agent slug does not exist', async () => {
    agentFindUniqueMock.mockResolvedValue(null)

    const result = await isAgentEnabled('unknown-agent', 'proj-1')

    expect(result.success).toBe(false)
  })
})

describe('aiAgentRegistryService.provisionDefaults', () => {
  beforeEach(() => vi.clearAllMocks())

  it('upserts one config per system agent', async () => {
    const agents = [
      { id: 'a1', slug: 'whatsapp-inbound' },
      { id: 'a2', slug: 'whatsapp-cadence' },
      { id: 'a3', slug: 'audience-intelligence' },
    ]
    agentFindManyMock.mockResolvedValue(agents)
    configUpsertMock.mockResolvedValue({})

    const result = await provisionDefaults('proj-1', 'org-1')

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe(3)
    expect(configUpsertMock).toHaveBeenCalledTimes(3)
  })

  it('is idempotent — update payload is empty to avoid overwriting manual config', async () => {
    agentFindManyMock.mockResolvedValue([{ id: 'a1', slug: 'whatsapp-inbound' }])
    configUpsertMock.mockResolvedValue({})

    await provisionDefaults('proj-1', 'org-1')

    expect(configUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} })
    )
  })
})

describe('aiAgentRegistryService.getProjectConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null config when project has no config for the agent', async () => {
    agentFindUniqueMock.mockResolvedValue({ id: 'agent-1', slug: 'whatsapp-inbound' })
    configFindUniqueMock.mockResolvedValue(null)

    const result = await getProjectConfig('whatsapp-inbound', 'proj-new')

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.config).toBeNull()
  })
})
