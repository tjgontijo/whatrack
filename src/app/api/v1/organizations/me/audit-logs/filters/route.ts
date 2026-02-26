import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { listOrganizationAuditResourceTypes } from '@/services/organizations/organization-audit.service'

export async function GET(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'view:audit')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  return NextResponse.json(await listOrganizationAuditResourceTypes(access.organizationId))
}
