import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auditService } from '@/lib/audit.service'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import {
  assertCanDelegatePermissions,
  getDelegatablePermissionCatalog,
} from '@/server/organization/permission-delegation-policy'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'
import {
  createOrganizationRole,
  listOrganizationRoles,
} from '@/server/organization/organization-rbac.service'

const createRoleSchema = z.object({
  key: z.string().min(2).max(64).optional(),
  name: z.string().min(2).max(80),
  description: z.string().max(240).nullable().optional(),
  permissions: z.array(z.string()).default([]),
})

export async function GET(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const roles = await listOrganizationRoles(access.teamId)
    return NextResponse.json({
      data: roles,
      permissionCatalog: getDelegatablePermissionCatalog(access.globalRole),
    })
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao listar papéis')
  }
}

export async function POST(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (access.role !== 'owner') {
    return NextResponse.json(
      { error: 'Apenas owner pode criar papéis personalizados.' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = createRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    assertCanDelegatePermissions(access.globalRole, parsed.data.permissions)

    const role = await createOrganizationRole({
      organizationId: access.teamId,
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description,
      permissions: parsed.data.permissions,
    })

    void auditService.log({
      organizationId: access.teamId,
      userId: access.userId,
      action: 'organization.role_created',
      resourceType: 'organization_role',
      resourceId: role.id,
      after: {
        key: role.key,
        name: role.name,
        permissions: role.permissions,
      },
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao criar papel')
  }
}
