import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { listOrganizationMembersWithOverrides } from '@/server/organization/organization-rbac.service'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'

export async function GET(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (access.role !== 'owner' && access.role !== 'admin') {
    return NextResponse.json(
      { error: 'Apenas owner/admin podem visualizar a lista de membros.' },
      { status: 403 }
    )
  }

  try {
    const members = await listOrganizationMembersWithOverrides(access.teamId)
    return NextResponse.json({ data: members })
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao listar membros')
  }
}
