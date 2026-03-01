import { NextRequest, NextResponse } from 'next/server'

import { requireSuperAdmin } from '@/lib/auth/guards'
import { apiError } from '@/lib/utils/api-response'
import { listSystemWebhookLogs } from '@/services/system/system-webhook-log.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request)
    if (user instanceof NextResponse) return user

    const response = await listSystemWebhookLogs()
    return NextResponse.json(response)
  } catch (error) {
    logger.error({ err: error }, '[whatsapp/webhook/logs] Error')
    return apiError('Failed to fetch logs', 500, error)
  }
}
