import { NextRequest, NextResponse } from 'next/server'

import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createWhatsAppOnboardingSession } from '@/services/whatsapp/whatsapp-onboarding.service'

export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/whatsapp/onboarding')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const access = await validatePermissionAccess(request, 'manage:whatsapp')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 })
    }

    const result = await createWhatsAppOnboardingSession(access.organizationId)

    if ('error' in result) {
      console.error('[Onboarding] Missing configuration:', result.error)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Onboarding] Error generating URL', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
