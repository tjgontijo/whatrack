/**
 * GET /api/v1/ai/credits
 * Get current AI credits balance and info
 */

import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { aiCreditsService } from '@/services/credits'

export async function GET(req: Request) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Access denied' },
      { status: 403 }
    )
  }

  const credits = await aiCreditsService.getCredits(access.organizationId)

  if (!credits) {
    return NextResponse.json({
      balance: 0,
      usedThisCycle: 0,
      quota: 0,
      planName: 'Free',
    })
  }

  return NextResponse.json(credits)
}
