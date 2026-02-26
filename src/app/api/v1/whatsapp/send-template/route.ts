import { NextResponse } from 'next/server'

import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { whatsappSendTemplateSchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = whatsappSendTemplateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const config = await MetaCloudService.getConfig(access.organizationId)

    if (!config || !config.phoneId) {
      return NextResponse.json(
        {
          error: 'WhatsApp not configured for this organization',
        },
        { status: 404 }
      )
    }

    const result = await MetaCloudService.sendTemplate({
      phoneId: config.phoneId,
      to: parsed.data.to,
      templateName: parsed.data.templateName,
      accessToken: config.accessToken ?? undefined,
    })

    return NextResponse.json({ success: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send message'
    console.error('[API] Send Template Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
