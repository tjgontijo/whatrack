import { NextRequest, NextResponse } from 'next/server'

import { requireSuperAdmin } from '@/lib/auth/guards'
import { apiError } from '@/lib/utils/api-response'
import { listSystemWebhookLogs } from '@/services/system/system-webhook-log.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request)
    if (user instanceof NextResponse) return user

    const response = await listSystemWebhookLogs()
    return NextResponse.json(response)
  } catch (error) {
    console.error('[whatsapp/webhook/logs] Error:', error)
    return apiError('Failed to fetch logs', 500, error)
  }
}
