import { type NextRequest, NextResponse } from 'next/server'
import { listSystemWebhookLogs } from '@/features/system/services/system-webhook-log.service'
import { requireSuperAdmin } from '@/lib/auth/guards'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'


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
