import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { toggleMetaAdAccount } from '@/services/meta-ads/meta-account-query.service'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  const { id } = await params

  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { isActive } = body

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({})
  }

  const result = await toggleMetaAdAccount({
    organizationId: access.organizationId,
    routeId: id,
    isActive,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result.data)
}
