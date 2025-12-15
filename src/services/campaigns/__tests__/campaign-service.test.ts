import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CampaignStatus, TemplateCategory } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  createCampaign,
  startCampaign,
  listRecipients,
  buildComponents,
} from '../campaign-service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    whatsAppTemplate: {
      findFirst: vi.fn(),
    },
    campaign: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    campaignRecipient: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((calls: any[]) => Promise.all(calls)),
  },
}))

vi.mock('../credits-service', () => ({
  debitCredits: vi.fn(),
}))

vi.mock('../campaign-processor', () => ({
  processCampaign: vi.fn(),
}))

describe('campaign-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.whatsAppTemplate.findFirst).mockResolvedValue({
      id: 'tpl-1',
      organizationId: 'org-1',
      name: 'promo',
      language: 'pt_BR',
      category: TemplateCategory.MARKETING,
    } as any)
    process.env.CAMPAIGN_MARKETING_PRICE = '1.00'
  })

  it('createCampaign calcula estimatedCost e cria recipients', async () => {
    vi.mocked(prisma.campaign.create).mockResolvedValue({
      id: 'cmp-1',
      estimatedCost: 200,
      totalRecipients: 2,
      status: CampaignStatus.DRAFT,
    } as any)

    const campaign = await createCampaign({
      organizationId: 'org-1',
      templateId: 'tpl-1',
      name: 'Black Friday',
      recipients: [
        { phone: '5511999999999' },
        { phone: '5511988888888', variables: { nome: 'Ana' } },
      ],
    })

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estimatedCost: 200, // 2 x 100 cents
          totalRecipients: 2,
          status: CampaignStatus.DRAFT,
          recipients: {
            create: [
              { phone: '5511999999999', variables: undefined },
              { phone: '5511988888888', variables: { nome: 'Ana' } },
            ],
          },
        }),
      })
    )
    expect(campaign.status).toBe(CampaignStatus.DRAFT)
  })

  it('startCampaign debita créditos e inicia processamento', async () => {
    const debitCredits = (await import('../credits-service')).debitCredits as any
    const processCampaign = (await import('../campaign-processor'))
      .processCampaign as any

    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
      id: 'cmp-1',
      organizationId: 'org-1',
      templateId: 'tpl-1',
      estimatedCost: 300,
      status: CampaignStatus.DRAFT,
      template: { id: 'tpl-1' },
    } as any)

    vi.mocked(prisma.campaign.update).mockResolvedValue({
      id: 'cmp-1',
      status: CampaignStatus.PROCESSING,
    } as any)

    const updated = await startCampaign({
      organizationId: 'org-1',
      campaignId: 'cmp-1',
    })

    expect(debitCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        amountCents: 300,
        campaignId: 'cmp-1',
      })
    )
    expect(processCampaign).toHaveBeenCalledWith('cmp-1')
    expect(updated.status).toBe(CampaignStatus.PROCESSING)
  })

  it('listRecipients pagina e filtra por status', async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
      id: 'cmp-1',
      organizationId: 'org-1',
    } as any)
    vi.mocked(prisma.campaignRecipient.findMany).mockResolvedValue([])
    vi.mocked(prisma.campaignRecipient.count).mockResolvedValue(0)

    const result = await listRecipients({
      organizationId: 'org-1',
      campaignId: 'cmp-1',
      status: 'SENT' as any,
      page: 2,
      pageSize: 10,
    })

    expect(prisma.campaignRecipient.findMany).toHaveBeenCalledWith({
      where: { campaignId: 'cmp-1', status: 'SENT' },
      orderBy: { id: 'asc' },
      skip: 10,
      take: 10,
    })
    expect(result).toEqual({ items: [], total: 0, page: 2, pageSize: 10 })
  })

  it('buildComponents converte variáveis em parâmetros de body', () => {
    const components = buildComponents([], { nome: 'Ana', pedido: 123 })
    expect(components).toEqual([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Ana' },
          { type: 'text', text: '123' },
        ],
      },
    ])
  })
})
