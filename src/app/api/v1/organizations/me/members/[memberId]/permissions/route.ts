import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'
import { updateOrganizationMemberOverridesSchema } from '@/schemas/organizations/organization-member-schemas'
import {
  getOrganizationMemberPermissionOverrides,
  updateOrganizationMemberPermissionOverrides,
} from '@/services/organizations/organization-members.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { memberId } = await params

  try {
    const result = await getOrganizationMemberPermissionOverrides({
      organizationId: access.organizationId,
      actorRole: access.role,
      actorGlobalRole: access.globalRole,
      memberId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao listar permissões do membro')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.userId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateOrganizationMemberOverridesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { memberId } = await params

  try {
    const result = await updateOrganizationMemberPermissionOverrides({
      organizationId: access.organizationId,
      actorUserId: access.userId,
      actorRole: access.role,
      actorGlobalRole: access.globalRole,
      memberId,
      allow: parsed.data.allow,
      deny: parsed.data.deny,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao atualizar overrides de permissões')
  }
}
