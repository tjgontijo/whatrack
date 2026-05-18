import {
  findCampaignStatus,
  groupCampaignRecipientsByStatus,
} from '@/features/whatsapp/repositories/find-campaign-recipient-stats.repository'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params

  const [campaign, statusCounts] = await Promise.all([
    findCampaignStatus(campaignId, access.organizationId),
    groupCampaignRecipientsByStatus(campaignId),
  ])

  if (!campaign) return apiError('Campanha não encontrada', 404)

  const counts = Object.fromEntries(
    statusCounts.map((row) => [row.status, row._count._all])
  ) as Record<string, number>

  const get = (s: string) => counts[s] ?? 0

  const total = statusCounts.reduce((sum, r) => sum + r._count._all, 0)
  const responded = get('RESPONDED')
  const read = get('READ') + responded
  const delivered = get('DELIVERED') + read
  const sent = get('SENT') + delivered
  const failed = get('FAILED') + get('EXCLUDED')
  const pending = get('PENDING')

  return apiSuccess({
    status: campaign.status,
    total,
    sent,
    delivered,
    read,
    responded,
    failed,
    pending,
    success: sent,
  })
}
