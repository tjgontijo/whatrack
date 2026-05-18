import type { NextRequest } from 'next/server'
import { findCampaignAbConfig } from '@/features/whatsapp/repositories/find-campaign-ab-config.repository'
import {
  getAbTestLeader,
  getAbTestMetrics,
} from '@/features/whatsapp/services/whatsapp-campaign-ab-metrics.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params

  const campaign = await findCampaignAbConfig(campaignId, access.organizationId)
  if (!campaign) return apiError('Campanha não encontrada', 404)
  if (!campaign.isAbTest) return apiError('Campanha não é do tipo A/B', 400)

  const config = campaign.abTestConfig as any
  const criterion = config?.winnerCriteria ?? 'RESPONSE_RATE'

  const [metricsResult, leaderResult] = await Promise.all([
    getAbTestMetrics(campaignId, access.organizationId),
    getAbTestLeader(campaignId, access.organizationId, criterion),
  ])

  if (!metricsResult.success) return apiError(metricsResult.error, 500)

  let windowRemainingMs: number | null = null
  if (campaign.startedAt && config?.windowHours) {
    const expiresAt = new Date(campaign.startedAt.getTime() + config.windowHours * 60 * 60 * 1000)
    windowRemainingMs = Math.max(0, expiresAt.getTime() - Date.now())
  }

  return apiSuccess({
    config,
    status: campaign.status,
    metrics: metricsResult.data,
    leaderId: leaderResult.success ? leaderResult.data : null,
    windowRemainingMs,
  })
}
