import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { ok, fail } from '@/lib/shared/result'
import type { Result } from '@/lib/shared/result'
import { WhatsAppCampaignEventType } from '@/lib/whatsapp/types/campaign-events'
import type { AbTestCreateInput } from '@/lib/whatsapp/schemas/whatsapp-ab-schemas'
import { runCampaignDispatch } from '@/services/whatsapp/whatsapp-campaign-execution.service'

export interface AbTestVariant {
  id: string
  label: string
  splitPercent: number
  dispatchGroupId: string
}

/**
 * Creates WhatsAppCampaignVariant records and matching dispatchGroups for each variant.
 * Should be called right after campaign creation when isAbTest = true.
 */
export async function createAbTestVariants(
  campaignId: string,
  input: AbTestCreateInput,
  organizationId: string
): Promise<Result<{ variants: AbTestVariant[]; remainderGroupId: string | null }>> {
  try {
    // Fetch the campaign to get configId (first dispatch group) and validate
    const campaign = await prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: { dispatchGroups: { orderBy: { order: 'asc' } } },
    })

    if (!campaign) return fail('Campanha não encontrada')
    if (!campaign.isAbTest) return fail('Campanha não é do tipo A/B')

    const baseConfigId =
      campaign.dispatchGroups[0]?.configId

    if (!baseConfigId) return fail('Nenhuma instância configurada na campanha')

    // Remove existing dispatch groups (will be replaced by per-variant groups)
    await prisma.whatsAppCampaignDispatchGroup.deleteMany({ where: { campaignId } })

    const variantRecords: AbTestVariant[] = []

    for (let i = 0; i < input.variants.length; i++) {
      const v = input.variants[i]

      const group = await prisma.whatsAppCampaignDispatchGroup.create({
        data: {
          campaignId,
          configId: baseConfigId,
          templateName: v.templateName,
          templateLang: v.templateLang,
          order: i,
          status: 'PENDING',
          isRemainder: false,
        },
      })

      const variant = await prisma.whatsAppCampaignVariant.create({
        data: {
          campaignId,
          label: v.label,
          dispatchGroupId: group.id,
          splitPercent: v.splitPercent,
        },
      })

      variantRecords.push({
        id: variant.id,
        label: variant.label,
        splitPercent: variant.splitPercent,
        dispatchGroupId: group.id,
      })
    }

    // Create remainder group if needed
    let remainderGroupId: string | null = null
    const remainderPercent = input.config.remainderPercent ?? 0
    if (remainderPercent > 0) {
      const remainderGroup = await prisma.whatsAppCampaignDispatchGroup.create({
        data: {
          campaignId,
          configId: baseConfigId,
          templateName: campaign.templateName || input.variants[0].templateName,
          templateLang: campaign.templateLang,
          order: input.variants.length,
          status: 'PENDING',
          isRemainder: true,
        },
      })
      remainderGroupId = remainderGroup.id
    }

    // Persist abTestConfig on the campaign
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        abTestConfig: {
          windowHours: input.config.windowHours,
          winnerCriteria: input.config.winnerCriteria,
          remainderPercent,
          winnerVariantId: null,
          winnerSelectedAt: null,
        },
      },
    })

    logger.info(
      { campaignId, variantCount: variantRecords.length, remainderGroupId },
      '[AbTest] Variants created'
    )

    return ok({ variants: variantRecords, remainderGroupId })
  } catch (err) {
    logger.error({ err, campaignId }, '[AbTest] Failed to create variants')
    return fail('Falha ao criar variantes do teste A/B')
  }
}

/**
 * Deterministically splits recipients among variants using campaignId as seed.
 * Called before dispatch starts.
 */
export async function splitAudienceForAbTest(
  campaignId: string
): Promise<Result<{ splitSummary: Record<string, number> }>> {
  const startTime = Date.now()
  try {
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: campaignId },
      include: {
        variants: { orderBy: { label: 'asc' } },
        whatsAppCampaignRecipients: {
          where: { variantId: null },
          select: { id: true, dispatchGroupId: true },
        },
      },
    })

    if (!campaign) return fail('Campanha não encontrada')
    if (!campaign.isAbTest || campaign.variants.length === 0) return fail('Campanha não é A/B')

    const recipients = campaign.whatsAppCampaignRecipients
    if (recipients.length === 0) return ok({ splitSummary: {} })

    // Deterministic shuffle using campaignId as seed
    const seeded = seededShuffle(recipients, campaignId)

    const splitSummary: Record<string, number> = {}
    let offset = 0

    for (const variant of campaign.variants) {
      const count = Math.round((variant.splitPercent / 100) * seeded.length)
      const slice = seeded.slice(offset, offset + count)
      offset += count

      if (slice.length === 0) {
        splitSummary[variant.label] = 0
        continue
      }

      await prisma.whatsAppCampaignRecipient.updateMany({
        where: { id: { in: slice.map((r) => r.id) } },
        data: {
          variantId: variant.id,
          dispatchGroupId: variant.dispatchGroupId,
        },
      })

      splitSummary[variant.label] = slice.length
    }

    logger.info(
      { campaignId, recipientCount: recipients.length, splitSummary, duration: Date.now() - startTime },
      '[AbTest] Audience split completed'
    )

    return ok({ splitSummary })
  } catch (err) {
    logger.error({ err, campaignId, duration: Date.now() - startTime }, '[AbTest] Audience split failed')
    return fail('Falha ao dividir audiência')
  }
}

/**
 * Selects a winner variant, records the event, and triggers remainder dispatch.
 */
export async function selectWinner(
  campaignId: string,
  variantId: string,
  userId: string,
  organizationId: string
): Promise<Result<void>> {
  try {
    const campaign = await prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: { variants: true },
    })

    if (!campaign) return fail('Campanha não encontrada')
    if (!campaign.isAbTest) return fail('Campanha não é do tipo A/B')

    const config = campaign.abTestConfig as any
    if (config?.winnerVariantId) return fail('Vencedor já selecionado para esta campanha')

    const variant = campaign.variants.find((v) => v.id === variantId)
    if (!variant) return fail('Variante não encontrada')

    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        abTestConfig: {
          ...config,
          winnerVariantId: variantId,
          winnerSelectedAt: new Date().toISOString(),
        },
      },
    })

    await prisma.whatsAppCampaignEvent.create({
      data: {
        campaignId,
        type: WhatsAppCampaignEventType.AB_WINNER_SELECTED,
        userId,
        metadata: { variantId, label: variant.label, templateName: (await prisma.whatsAppCampaignDispatchGroup.findUnique({ where: { id: variant.dispatchGroupId }, select: { templateName: true } }))?.templateName },
      },
    })

    // Check if there is a remainder group to dispatch
    const remainderGroup = await prisma.whatsAppCampaignDispatchGroup.findFirst({
      where: { campaignId, isRemainder: true },
    })

    if (remainderGroup) {
      // Update remainder group to use winner template
      const winnerGroup = await prisma.whatsAppCampaignDispatchGroup.findUnique({
        where: { id: variant.dispatchGroupId },
      })
      if (winnerGroup) {
        await prisma.whatsAppCampaignDispatchGroup.update({
          where: { id: remainderGroup.id },
          data: { templateName: winnerGroup.templateName, templateLang: winnerGroup.templateLang },
        })
      }

      await prisma.whatsAppCampaignEvent.create({
        data: {
          campaignId,
          type: WhatsAppCampaignEventType.AB_REMAINDER_DISPATCHED,
          userId,
          metadata: { variantId, remainderGroupId: remainderGroup.id },
        },
      })

      // Trigger remainder dispatch in background
      await runCampaignDispatch(campaignId, organizationId)
    }

    logger.info({ campaignId, variantId, userId }, '[AbTest] Winner selected')
    return ok(undefined)
  } catch (err) {
    logger.error({ err, campaignId }, '[AbTest] Winner selection failed')
    return fail('Falha ao selecionar vencedor')
  }
}

/**
 * Automatically selects the winner based on the configured criterion.
 * Called by the cron job when the test window expires.
 */
export async function autoSelectWinner(
  campaignId: string,
  organizationId: string
): Promise<Result<{ selected: boolean; variantId?: string }>> {
  try {
    const campaign = await prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: { variants: true },
    })

    if (!campaign || !campaign.isAbTest) return fail('Campanha inválida ou não é A/B')

    const config = campaign.abTestConfig as any
    if (config?.winnerVariantId) return ok({ selected: false }) // already selected

    const criterion: 'RESPONSE_RATE' | 'READ_RATE' | 'MANUAL' = config?.winnerCriteria ?? 'RESPONSE_RATE'

    if (criterion === 'MANUAL') return ok({ selected: false })

    // Collect metrics per variant
    const variantMetrics = await Promise.all(
      campaign.variants.map(async (variant) => {
      const [total, sentCount, respondedCount, readCount] = await Promise.all([
          prisma.whatsAppCampaignRecipient.count({ where: { variantId: variant.id } }),
          prisma.whatsAppCampaignRecipient.count({ where: { variantId: variant.id, status: { in: ['SENT', 'DELIVERED', 'READ', 'RESPONDED'] } } }),
          prisma.whatsAppCampaignRecipient.count({ where: { variantId: variant.id, status: 'RESPONDED' } }),
          prisma.whatsAppCampaignRecipient.count({ where: { variantId: variant.id, status: { in: ['READ', 'RESPONDED'] } } }),
        ])
        return { variantId: variant.id, label: variant.label, sentCount, respondedCount, readCount, total }
      })
    )

    // Minimum threshold: each variant must have at least 100 sent
    const hasEnoughData = variantMetrics.every((m) => m.sentCount >= 100)
    if (!hasEnoughData) {
      await prisma.whatsAppCampaignEvent.create({
        data: {
          campaignId,
          type: WhatsAppCampaignEventType.AB_INSUFFICIENT_DATA,
          metadata: { variantMetrics },
        },
      })
      logger.warn({ campaignId, variantMetrics }, '[AbTest] Insufficient data for auto-promotion')
      return ok({ selected: false })
    }

    // Find the winner by criterion
    const sorted = [...variantMetrics].sort((a, b) => {
      const rateA =
        criterion === 'RESPONSE_RATE'
          ? a.sentCount > 0 ? a.respondedCount / a.sentCount : 0
          : a.sentCount > 0 ? a.readCount / a.sentCount : 0
      const rateB =
        criterion === 'RESPONSE_RATE'
          ? b.sentCount > 0 ? b.respondedCount / b.sentCount : 0
          : b.sentCount > 0 ? b.readCount / b.sentCount : 0
      // Tiebreak by label (A > B > C)
      if (rateB === rateA) return a.label.localeCompare(b.label)
      return rateB - rateA
    })

    const winner = sorted[0]
    logger.info({ campaignId, winner, criterion }, '[AbTest] Leader calculated')

    const result = await selectWinner(campaignId, winner.variantId, 'SYSTEM', organizationId)
    if (!result.success) return result as any

    return ok({ selected: true, variantId: winner.variantId })
  } catch (err) {
    logger.error({ err, campaignId }, '[AbTest] Auto winner selection failed')
    return fail('Falha na seleção automática do vencedor')
  }
}

/** Seeded Fisher-Yates shuffle */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr]
  let s = hashCode(seed)
  for (let i = copy.length - 1; i > 0; i--) {
    s = ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0
    const j = s % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash)
}
