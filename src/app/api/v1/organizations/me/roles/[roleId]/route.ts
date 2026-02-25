import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auditService } from '@/services/audit/audit.service'
import { prisma } from '@/lib/db/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { assertCanDelegatePermissions } from '@/server/organization/permission-delegation-policy'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'
import {
  deleteOrganizationRole,
  updateOrganizationRole,
} from '@/server/organization/organization-rbac.service'

const updateRoleSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(240).nullable().optional(),
    permissions: z.array(z.string()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualização.',
  })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (access.role !== 'owner') {
    return NextResponse.json(
      { error: 'Apenas owner pode editar papéis personalizados.' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { roleId } = await params
  const before = await prisma.organizationRole.findFirst({
    where: {
      id: roleId,
      organizationId: access.teamId,
    },
    include: {
      permissions: {
        select: {
          permissionKey: true,
        },
      },
    },
  })

  if (!before) {
    return NextResponse.json({ error: 'Papel não encontrado' }, { status: 404 })
  }

  try {
    if (parsed.data.permissions) {
      assertCanDelegatePermissions(access.globalRole, parsed.data.permissions)
    }

    const updated = await updateOrganizationRole({
      organizationId: access.teamId,
      roleId,
      name: parsed.data.name,
      description: parsed.data.description,
      permissions: parsed.data.permissions,
    })

    void auditService.log({
      organizationId: access.teamId,
      userId: access.userId,
      action: 'organization.role_updated',
      resourceType: 'organization_role',
      resourceId: roleId,
      before: {
        key: before.key,
        name: before.name,
        description: before.description,
        permissions: before.permissions.map((item) => item.permissionKey),
      },
      after: {
        key: updated.key,
        name: updated.name,
        description: updated.description,
        permissions: updated.permissions,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao atualizar papel')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (access.role !== 'owner') {
    return NextResponse.json(
      { error: 'Apenas owner pode remover papéis personalizados.' },
      { status: 403 }
    )
  }

  const { roleId } = await params
  const before = await prisma.organizationRole.findFirst({
    where: {
      id: roleId,
      organizationId: access.teamId,
    },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
    },
  })

  if (!before) {
    return NextResponse.json({ error: 'Papel não encontrado' }, { status: 404 })
  }

  try {
    await deleteOrganizationRole({
      organizationId: access.teamId,
      roleId,
    })

    void auditService.log({
      organizationId: access.teamId,
      userId: access.userId,
      action: 'organization.role_deleted',
      resourceType: 'organization_role',
      resourceId: roleId,
      before,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao remover papel')
  }
}
