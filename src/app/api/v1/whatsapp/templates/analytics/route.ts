import { NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { WhatsAppTemplateAnalyticsService } from '@/services/whatsapp/whatsapp-template-analytics.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const stats = await WhatsAppTemplateAnalyticsService.getStats(access.organizationId)
  return NextResponse.json({ stats })
}
