import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { whatsappSendTemplateSchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const parsed = whatsappSendTemplateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
    }

    const config = await MetaCloudService.getConfig(access.organizationId)

    if (!config || !config.phoneId) {
      return apiError('WhatsApp not configured for this organization', 404)
    }

    const result = await MetaCloudService.sendTemplate({
      phoneId: config.phoneId,
      to: parsed.data.to,
      templateName: parsed.data.templateName,
      language: parsed.data.language,
      variables: parsed.data.variables,
      accessToken: MetaCloudService.getAccessTokenForConfig(config) || undefined,
    })

    return NextResponse.json({ success: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send message'
    logger.error({ err: error }, '[API] Send Template Error')
    return apiError(message, 500, error)
  }
}
