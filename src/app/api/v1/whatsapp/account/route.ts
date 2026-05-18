import { NextResponse } from 'next/server'
import { MetaCloudService } from '@/features/whatsapp/services/meta-cloud.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const config = await MetaCloudService.getConfig(access.organizationId)

    if (!config?.wabaId) {
      return apiError('WhatsApp not configured for this organization', 404)
    }

    const account = await MetaCloudService.getAccountInfo({
      wabaId: config.wabaId,
    })

    return NextResponse.json(account)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch account info'
    logger.error({ err: error }, '[API] Get Account Info Error')
    return apiError(message, 500, error)
  }
}
