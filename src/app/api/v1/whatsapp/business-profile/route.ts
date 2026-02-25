import { NextResponse } from 'next/server'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const profile = await MetaCloudService.getBusinessProfile({
      phoneId: config.phoneId,
    })

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error('[API] Get Business Profile Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business profile' },
      { status: 500 }
    )
  }
}
