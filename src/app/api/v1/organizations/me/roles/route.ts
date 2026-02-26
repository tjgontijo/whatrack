import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'
import { createOrganizationRoleSchema } from '@/schemas/organizations/organization-role-schemas'
import {
  createOrganizationRoleWithAudit,
  listOrganizationRolesWithCatalog,
} from '@/services/organizations/organization-roles.service'

export async function GET(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
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
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = createOrganizationRoleSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
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
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao criar papel')
  }
}
