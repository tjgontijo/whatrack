import { NextRequest, NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listWhatsAppInstances } from '@/services/whatsapp/whatsapp-config.service'

export async function GET(request: NextRequest) {
  try {
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 })
    }

    const response = await listWhatsAppInstances(access.organizationId)
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[WhatsApp Instances] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 })
  }
}
