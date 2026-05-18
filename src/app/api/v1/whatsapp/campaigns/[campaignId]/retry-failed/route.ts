import type { NextRequest } from 'next/server'
import { retryCampaignFailedService } from '@/features/whatsapp/services/retry-campaign-failed.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

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

    const result = await retryCampaignFailedService(campaignId, access.organizationId)
    return apiSuccess(result)
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      return apiError(error.message, error.status as number)
    }
    return apiError(error instanceof Error ? error.message : 'Erro ao processar reenvio', 500)
  }
}
