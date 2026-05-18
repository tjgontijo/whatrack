import { NextResponse } from 'next/server'
import { WhatsAppTemplateAnalyticsService } from '@/features/whatsapp/services/whatsapp-template-analytics.service'
import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const stats = await WhatsAppTemplateAnalyticsService.getStats(access.organizationId)
  return NextResponse.json({ stats })
}
