import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { getServerSession } from '@/server/auth/server'
import { getOrganizationCompletion } from '@/features/organizations/services/organization.service'

export async function GET(request: NextRequest) {
  const session = await getServerSession(request)
  if (!session) {
    return apiError('Unauthorized', 401)
  }

  const completion = await getOrganizationCompletion({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })

  return NextResponse.json(completion)
}
