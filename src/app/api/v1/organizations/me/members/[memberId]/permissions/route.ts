import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
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
    return apiError(access.error ?? 'Acesso negado', 403)
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
      return apiError(result.error, result.status)
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
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = updateOrganizationMemberOverridesSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
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
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao atualizar overrides de permissões')
  }
}
