import { NextResponse } from 'next/server'

import { whatsappClaimWabaSchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { claimWhatsAppWaba } from '@/services/whatsapp/whatsapp-config.service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  console.warn(
    '[DEPRECATED] POST /api/v1/whatsapp/claim-waba is deprecated as of v2.1. Use webhook-based onboarding instead.'
  )

  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = whatsappClaimWabaSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const config = await claimWhatsAppWaba({
      organizationId: access.organizationId,
      wabaId: parsed.data.wabaId,
      code: parsed.data.code,
      phoneNumberId: parsed.data.phoneNumberId,
    })

    return NextResponse.json(
      {
        success: true,
        deprecated: true,
        warning:
          'This endpoint is deprecated as of v2.1. Use webhook-based onboarding instead. See docs/whatsapp-onboarding-prd-v2.md',
        config: {
          id: config.id,
          wabaId: config.wabaId,
          phoneId: config.phoneId,
          status: config.status,
        },
      },
      {
        status: 200,
        headers: {
          Deprecation: 'true',
          Sunset: 'Sun, 31 Dec 2024 23:59:59 GMT',
        },
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to claim WABA'
    console.error('[API] Claim WABA Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
