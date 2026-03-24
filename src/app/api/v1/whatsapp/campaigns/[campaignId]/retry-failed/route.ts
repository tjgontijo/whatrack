import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationSlug: string; campaignId: string }> }
) {
  const { organizationSlug, campaignId } = await params

  const access = await requireWorkspacePageAccess({
    permissions: 'manage:integrations',
    organizationSlug,
  })

  try {
    // 1. Verificar se a campanha existe e pertence à organização
    const campaign = await prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId: access.organizationId },
    })

    if (!campaign) {
      return apiError('Campanha não encontrada', 404)
    }

    // 2. Encontrar destinatários com erro
    const failedRecipients = await prisma.whatsAppCampaignRecipient.findMany({
      where: {
        dispatchGroup: { campaignId },
        status: 'FAILED',
      },
      select: { id: true, dispatchGroupId: true },
    })

    if (failedRecipients.length === 0) {
      return apiError('Nenhum destinatário com falha encontrado para reenvio', 400)
    }

    // 3. Resetar destinatários para PENDING
    await prisma.whatsAppCampaignRecipient.updateMany({
      where: {
        id: { in: failedRecipients.map((r) => r.id) },
      },
      data: {
        status: 'PENDING',
        failedAt: null,
        failureReason: null,
        metaWamid: null,
      },
    })

    // 4. Resetar os Grupos de Despacho afetados para PROCESSING ou PENDING
    const groupIds = Array.from(new Set(failedRecipients.map((r) => r.dispatchGroupId)))
    await prisma.whatsAppCampaignDispatchGroup.updateMany({
      where: {
        id: { in: groupIds.filter((id): id is string => id !== null) },
      },
      data: {
        status: 'PENDING',
      },
    })

    // 5. Resetar a Campanha para PROCESSING para o cron pegar novamente
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'PROCESSING',
        completedAt: null,
      },
    })

    return apiSuccess({
      message: `${failedRecipients.length} destinatários agendados para reenvio.`,
      retriedCount: failedRecipients.length,
    })
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao processar reenvio', 500)
  }
}
