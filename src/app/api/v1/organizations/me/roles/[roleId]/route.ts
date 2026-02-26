import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'
import { updateOrganizationRoleSchema } from '@/schemas/organization-role-schemas'
import {
  deleteOrganizationRoleWithAudit,
  updateOrganizationRoleWithAudit,
} from '@/services/organizations/organization-roles.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.userId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateOrganizationRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { roleId } = await params

  try {
    const result = await updateOrganizationRoleWithAudit({
      organizationId: access.organizationId,
      actorUserId: access.userId,
      actorRole: access.role,
      actorGlobalRole: access.globalRole,
      roleId,
      data: parsed.data,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao atualizar papel')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.userId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { roleId } = await params

  try {
    const result = await deleteOrganizationRoleWithAudit({
      organizationId: access.organizationId,
      actorUserId: access.userId,
      actorRole: access.role,
      roleId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao remover papel')
  }
}
