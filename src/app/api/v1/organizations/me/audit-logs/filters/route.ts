import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { listOrganizationAuditResourceTypes } from '@/services/organizations/organization-audit.service'

export async function GET(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'view:audit')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  return NextResponse.json(await listOrganizationAuditResourceTypes(access.organizationId))
}
