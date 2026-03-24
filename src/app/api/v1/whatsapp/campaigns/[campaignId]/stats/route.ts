import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params

  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId: access.organizationId },
    select: { status: true },
  })

  if (!campaign) {
    return apiError('Campanha não encontrada', 404)
  }

  const [total, success, failed] = await Promise.all([
    prisma.whatsAppCampaignRecipient.count({
      where: { campaignId }
    }),
    prisma.whatsAppCampaignRecipient.count({
      where: { campaignId, status: { in: ['SENT', 'DELIVERED', 'READ', 'RESPONDED'] } }
    }),
    prisma.whatsAppCampaignRecipient.count({
      where: { campaignId, status: { in: ['FAILED', 'EXCLUDED'] } }
    }),
  ])

  return apiSuccess({
    status: campaign.status,
    total,
    success,
    failed,
    pending: total - success - failed,
  })
}
