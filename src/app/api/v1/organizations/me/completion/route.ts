import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/server/auth/server'
import { getOrganizationCompletion } from '@/services/organizations/organization.service'

export async function GET(request: NextRequest) {
  const session = await getServerSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const completion = await getOrganizationCompletion({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })

  return NextResponse.json(completion)
}
