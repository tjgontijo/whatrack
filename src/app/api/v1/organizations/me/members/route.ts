import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'
import { listOrganizationMembers } from '@/services/organizations/organization-members.service'

export async function GET(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const result = await listOrganizationMembers({
      organizationId: access.organizationId,
      role: access.role,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao listar membros')
  }
}
