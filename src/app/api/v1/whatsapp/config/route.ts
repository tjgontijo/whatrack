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

    if (!config) {
      return NextResponse.json(
        {
          error: 'WhatsApp not configured for this organization',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(config)
  } catch (error: any) {
    console.error('[API] Get Config Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}
