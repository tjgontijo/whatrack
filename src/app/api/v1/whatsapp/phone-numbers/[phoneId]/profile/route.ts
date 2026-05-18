import { NextResponse } from 'next/server'
import { findWhatsAppConfigByPhoneId } from '@/features/whatsapp/repositories/find-whatsapp-config-by-phone.repository'
import { MetaCloudService } from '@/features/whatsapp/services/meta-cloud.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ phoneId: string }> }) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const { phoneId } = await params

    const config = await findWhatsAppConfigByPhoneId(phoneId, access.organizationId)
    if (!config) return apiError('Phone number not found or does not belong to this organization', 404)
    if (!config.phoneId) return apiError('Phone ID not configured for this instance', 400)

    const profile = await MetaCloudService.getBusinessProfile({ phoneId: config.phoneId })
    return NextResponse.json(profile)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch phone profile'
    logger.error({ err: error }, '[API] Get Phone Profile Error')
    return apiError(message, 500, error)
  }
}
