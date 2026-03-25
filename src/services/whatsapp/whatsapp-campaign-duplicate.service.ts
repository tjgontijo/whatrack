import { prisma } from '@/lib/db/prisma'
import { logger } from '@/server/logger'
import { ok, fail } from '@/lib/shared/result'
import type { Result } from '@/lib/shared/result'

export async function duplicateCampaign(
  campaignId: string,
  organizationId: string
): Promise<Result<{ campaignId: string; name: string }>> {
  try {
    // Fetch original campaign with first dispatch group
    const originalCampaign = await prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        dispatchGroups: {
          where: { order: 0 },
          take: 1,
        },
      },
    })

    if (!originalCampaign) {
      return fail('Campanha não encontrada')
    }

    if (originalCampaign.dispatchGroups.length === 0) {
      return fail('Campanha não tem grupo de envio')
    }

    const primaryGroup = originalCampaign.dispatchGroups[0]

    // Create new campaign
    const newCampaign = await prisma.whatsAppCampaign.create({
      data: {
        name: `${originalCampaign.name} — Cópia`,
        type: originalCampaign.type,
        status: 'DRAFT',
        projectId: originalCampaign.projectId,
        organizationId,
        instanceId: originalCampaign.instanceId,
        templateName: originalCampaign.templateName,
        templateLang: originalCampaign.templateLang,
        isAbTest: false,
        abTestConfig: null,
      },
    })

    // Create new dispatch group (without A/B variant)
    await prisma.whatsAppCampaignDispatchGroup.create({
      data: {
        campaignId: newCampaign.id,
        templateName: primaryGroup.templateName,
        templateLang: primaryGroup.templateLang,
        templateComponents: primaryGroup.templateComponents,
        order: 0,
        isRemainder: false,
      },
    })

    // Create campaign event
    await prisma.whatsAppCampaignEvent.create({
      data: {
        campaignId: newCampaign.id,
        type: 'CREATED',
        metadata: { duplicatedFromId: campaignId },
      },
    })

    logger.info(
      { originalId: campaignId, newId: newCampaign.id, newName: newCampaign.name },
      '[CampaignDuplicate] Campaign duplicated successfully'
    )

    return ok({
      campaignId: newCampaign.id,
      name: newCampaign.name,
    })
  } catch (err) {
    logger.error({ err, campaignId }, '[CampaignDuplicate] Failed to duplicate campaign')
    return fail('Erro ao duplicar campanha')
  }
}
