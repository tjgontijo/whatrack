import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'
import { createOrganizationRoleSchema } from '@/schemas/organization-role-schemas'
import {
  createOrganizationRoleWithAudit,
  listOrganizationRolesWithCatalog,
} from '@/services/organizations/organization-roles.service'

export async function GET(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    return NextResponse.json(
      await listOrganizationRolesWithCatalog({
        organizationId: access.organizationId,
        globalRole: access.globalRole,
      })
    )
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao listar papéis')
  }
}

export async function POST(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.userId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createOrganizationRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await createOrganizationRoleWithAudit({
      organizationId: access.organizationId,
      actorUserId: access.userId,
      actorRole: access.role,
      actorGlobalRole: access.globalRole,
      data: parsed.data,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao criar papel')
  }
}
