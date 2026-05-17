import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { ok, fail } from '@/lib/shared/result'
import type { Result } from '@/lib/shared/result'

export interface VariantMetric {
  variantId: string
  label: string
  templateName: string
  splitPercent: number
  totalCount: number
  sentCount: number
  deliveredCount: number
  readCount: number
  respondedCount: number
  failCount: number
  responseRate: number
  readRate: number
}

export async function getAbTestMetrics(
  campaignId: string,
  organizationId: string
): Promise<Result<VariantMetric[]>> {
  try {
    const campaign = await prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        variants: {
          include: {
            dispatchGroup: { select: { templateName: true } },
          },
          orderBy: { label: 'asc' },
        },
      },
    })

    if (!campaign) return fail('Campanha não encontrada')
    if (!campaign.isAbTest) return fail('Campanha não é do tipo A/B')

    const metrics: VariantMetric[] = await Promise.all(
      campaign.variants.map(async (variant) => {
        const [total, sent, delivered, read, responded, failed] = await Promise.all([
          prisma.whatsAppCampaignRecipient.count({ where: { variantId: variant.id } }),
          prisma.whatsAppCampaignRecipient.count({
            where: { variantId: variant.id, status: { in: ['SENT', 'DELIVERED', 'READ', 'RESPONDED'] } },
          }),
          prisma.whatsAppCampaignRecipient.count({
            where: { variantId: variant.id, status: { in: ['DELIVERED', 'READ', 'RESPONDED'] } },
          }),
          prisma.whatsAppCampaignRecipient.count({
            where: { variantId: variant.id, status: { in: ['READ', 'RESPONDED'] } },
          }),
          prisma.whatsAppCampaignRecipient.count({
            where: { variantId: variant.id, status: 'RESPONDED' },
          }),
          prisma.whatsAppCampaignRecipient.count({
            where: { variantId: variant.id, status: 'FAILED' },
          }),
        ])

        return {
          variantId: variant.id,
          label: variant.label,
          templateName: variant.dispatchGroup.templateName,
          splitPercent: variant.splitPercent,
          totalCount: total,
          sentCount: sent,
          deliveredCount: delivered,
          readCount: read,
          respondedCount: responded,
          failCount: failed,
          responseRate: sent > 0 ? responded / sent : 0,
          readRate: sent > 0 ? read / sent : 0,
        }
      })
    )

    return ok(metrics)
  } catch (err) {
    logger.error({ err, campaignId }, '[AbTest] Failed to get metrics')
    return fail('Falha ao buscar métricas A/B')
  }
}

export async function getAbTestLeader(
  campaignId: string,
  organizationId: string,
  criterion: 'RESPONSE_RATE' | 'READ_RATE' | 'MANUAL'
): Promise<Result<string | null>> {
  if (criterion === 'MANUAL') return ok(null)

  const metricsResult = await getAbTestMetrics(campaignId, organizationId)
  if (!metricsResult.success) return metricsResult as any

  const metrics = metricsResult.data
  if (metrics.every((m) => m.sentCount === 0)) return ok(null)

  const sorted = [...metrics].sort((a, b) => {
    const rateA = criterion === 'RESPONSE_RATE' ? a.responseRate : a.readRate
    const rateB = criterion === 'RESPONSE_RATE' ? b.responseRate : b.readRate
    if (rateA === rateB) return a.label.localeCompare(b.label) // tiebreak by label
    return rateB - rateA
  })

  const leader = sorted[0]
  logger.info({ campaignId, leader: leader.variantId, criterion }, '[AbTest] Leader calculated')

  return ok(leader.variantId)
}
