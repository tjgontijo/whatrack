/**
 * API Routes - /api/v1/organizations/current
 *
 * GET - Get current user's organization
 */

import { NextResponse } from 'next/server'

import { getOrSyncUser } from '@/server/auth/server'
import { getOrCreateCurrentOrganization } from '@/services/organizations/organization-management.service'

export async function GET(request: Request) {
  try {
    const user = await getOrSyncUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getOrCreateCurrentOrganization({ user }), { status: 200 })
  } catch (error) {
    console.error('Failed to get current organization:', error)
    return NextResponse.json({ error: 'Failed to get organization' }, { status: 500 })
  }
}
