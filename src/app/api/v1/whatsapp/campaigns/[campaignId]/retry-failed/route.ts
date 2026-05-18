import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { enqueueCampaignDispatch } from '@/server/queues/campaign.queue'

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Não autorizado', 401)
    }

    const campaign = await prisma.whatsAppCampaign.findFirst({
      where: {
        id: campaignId,
        organizationId: access.organizationId,
        status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
      },
    })

    if (!campaign) {
      return apiError('Campanha não encontrada ou em estado inválido para reenvio', 404)
    }

    const candidates = await prisma.whatsAppCampaignRecipient.findMany({
      where: {
        dispatchGroup: { campaignId },
        OR: [{ status: 'FAILED' }, { status: 'PENDING', metaWamid: null }],
      },
      select: { id: true, status: true, dispatchGroupId: true },
    })

    if (candidates.length === 0) {
      return apiError('Nenhum destinatário pendente ou com falha encontrado para reenvio', 400)
    }

    const failedIds = candidates.filter((r) => r.status === 'FAILED').map((r) => r.id)
    if (failedIds.length > 0) {
      await prisma.whatsAppCampaignRecipient.updateMany({
        where: { id: { in: failedIds } },
        data: { status: 'PENDING', failedAt: null, failureReason: null, metaWamid: null },
      })
    }

    const groupIds = Array.from(new Set(candidates.map((r) => r.dispatchGroupId)))
    await prisma.whatsAppCampaignDispatchGroup.updateMany({
      where: { id: { in: groupIds.filter((id): id is string => id !== null) } },
      data: { status: 'PENDING' },
    })

    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: { status: 'PROCESSING', completedAt: null },
    })

    await enqueueCampaignDispatch(campaignId, access.organizationId)

    return apiSuccess({
      message: `${candidates.length} destinatários agendados para (re)envio.`,
      retriedCount: candidates.length,
    })
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao processar reenvio', 500)
  }
}
