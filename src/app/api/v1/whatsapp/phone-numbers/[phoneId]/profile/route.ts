import { NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phoneId: string }> },
) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const { phoneId } = await params

    // Validate that the phoneId (Meta ID) belongs to a WhatsAppConfig in this organization
    const config = await prisma.whatsAppConfig.findFirst({
      where: {
        phoneId,
        organizationId: access.organizationId,
      },
    })

    if (!config) {
      return apiError('Phone number not found or does not belong to this organization', 404)
    }

    if (!config.phoneId) {
      return apiError('Phone ID not configured for this instance', 400)
    }

    // Get the business profile from Meta Cloud Service
    const profile = await MetaCloudService.getBusinessProfile({
      phoneId: config.phoneId,
    })

    return NextResponse.json(profile)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch phone profile'
    logger.error({ err: error }, '[API] Get Phone Profile Error')
    return apiError(message, 500, error)
  }
}
