import "server-only"
import { prisma } from '@/lib/db/prisma'
import { enqueueCampaignDispatch } from '@/server/queues/campaign.queue'

export async function retryCampaignFailedService(campaignId: string, organizationId: string) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: {
      id: campaignId,
      organizationId,
      status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
    },
    select: { id: true },
  })

  if (!campaign) {
    throw Object.assign(
      new Error('Campanha não encontrada ou em estado inválido para reenvio'),
      { status: 404 }
    )
  }

  const candidates = await prisma.whatsAppCampaignRecipient.findMany({
    where: {
      dispatchGroup: { campaignId },
      OR: [{ status: 'FAILED' }, { status: 'PENDING', metaWamid: null }],
    },
    select: { id: true, status: true, dispatchGroupId: true },
  })

  if (candidates.length === 0) {
    throw Object.assign(
      new Error('Nenhum destinatário pendente ou com falha encontrado para reenvio'),
      { status: 400 }
    )
  }

  const failedIds = candidates.filter((r) => r.status === 'FAILED').map((r) => r.id)
  if (failedIds.length > 0) {
    await prisma.whatsAppCampaignRecipient.updateMany({
      where: { id: { in: failedIds } },
      data: { status: 'PENDING', failedAt: null, failureReason: null, metaWamid: null },
    })
  }

  const groupIds = Array.from(
    new Set(candidates.map((r) => r.dispatchGroupId).filter((id): id is string => id !== null))
  )
  await prisma.whatsAppCampaignDispatchGroup.updateMany({
    where: { id: { in: groupIds } },
    data: { status: 'PENDING' },
  })

  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: { status: 'PROCESSING', completedAt: null },
    select: { id: true },
  })

  await enqueueCampaignDispatch(campaignId, organizationId)

  return {
    message: `${candidates.length} destinatários agendados para (re)envio.`,
    retriedCount: candidates.length,
  }
}
