/**
 * API Routes - /api/v1/organizations/current
 *
 * GET - Get current user's organization
 */

import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { getOrSyncUser } from '@/server/auth/server'
import { getOrCreateCurrentOrganization } from '@/services/organizations/organization-management.service'

export async function GET(request: Request) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return apiError('Unauthorized', 401)
    }

    return NextResponse.json(await getOrCreateCurrentOrganization({ user }), { status: 200 })
  } catch (error) {
    console.error('Failed to get current organization:', error)
    return apiError('Failed to get organization', 500, error)
  }
}
