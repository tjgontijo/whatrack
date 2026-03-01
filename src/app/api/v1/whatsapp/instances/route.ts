import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listWhatsAppInstances } from '@/services/whatsapp/whatsapp-config.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const response = await listWhatsAppInstances(access.organizationId)
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error({ err: error }, '[WhatsApp Instances] Error')
    return apiError('Failed to fetch instances', 500, error)
  }
}
