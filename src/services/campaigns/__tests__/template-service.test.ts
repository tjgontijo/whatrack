import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TemplateCategory, TemplateStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { listTemplates, syncTemplates } from '../template-service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    metaWhatsAppCredential: {
      findUnique: vi.fn(),
    },
    whatsAppTemplate: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((calls: any[]) => Promise.all(calls)),
  },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('template-service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.META_API_VERSION = 'v21.0'
    process.env.META_APP_ID = 'app'
    process.env.META_APP_SECRET = 'secret'
    process.env.META_WEBHOOK_VERIFY_TOKEN = 'verify'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('listTemplates aplica filtros e paginação', async () => {
    vi.mocked(prisma.whatsAppTemplate.findMany).mockResolvedValue([])
    vi.mocked(prisma.whatsAppTemplate.count).mockResolvedValue(0)

    const result = await listTemplates({
      organizationId: 'org-1',
      category: TemplateCategory.MARKETING,
      status: TemplateStatus.APPROVED,
      page: 2,
      pageSize: 10,
    })

    expect(prisma.whatsAppTemplate.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        category: TemplateCategory.MARKETING,
        status: TemplateStatus.APPROVED,
      },
      orderBy: { name: 'asc' },
      skip: 10,
      take: 10,
    })
    expect(result).toEqual({ items: [], total: 0, page: 2, pageSize: 10 })
  })

  it('syncTemplates mapeia categorias/status e faz upsert', async () => {
    vi.mocked(prisma.metaWhatsAppCredential.findUnique).mockResolvedValue({
      organizationId: 'org-1',
      wabaId: 'waba-123',
      accessToken: 'token',
    } as any)

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'tpl-1',
              name: 'promo',
              language: 'pt_BR',
              category: 'MARKETING',
              status: 'APPROVED',
              components: [{ type: 'body', text: 'Olá {{1}}' }],
            },
          ],
        }),
        { status: 200 }
      )
    )

    vi.mocked(prisma.whatsAppTemplate.findMany).mockResolvedValue([
      {
        id: 'tpl-1',
        organizationId: 'org-1',
        templateId: 'tpl-1',
        name: 'promo',
        language: 'pt_BR',
        category: TemplateCategory.MARKETING,
        status: TemplateStatus.APPROVED,
        components: {},
        syncedAt: new Date(),
      } as any,
    ])
    vi.mocked(prisma.whatsAppTemplate.count).mockResolvedValue(1)

    const result = await syncTemplates('org-1')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/waba-123/message_templates'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      })
    )

    expect(prisma.whatsAppTemplate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_templateId: {
            organizationId: 'org-1',
            templateId: 'tpl-1',
          },
        },
        create: expect.objectContaining({
          category: TemplateCategory.MARKETING,
          status: TemplateStatus.APPROVED,
        }),
        update: expect.objectContaining({
          category: TemplateCategory.MARKETING,
          status: TemplateStatus.APPROVED,
        }),
      })
    )

    expect(result.total).toBe(1)
  })

  it('syncTemplates lança erro quando credencial não existe', async () => {
    vi.mocked(prisma.metaWhatsAppCredential.findUnique).mockResolvedValue(null)
    await expect(syncTemplates('org-1')).rejects.toThrow('Meta credential not configured')
  })
})
