import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auditService } from '@/services/audit/audit.service'
import { prisma } from '@/lib/db/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import {
  assertCanDelegatePermissions,
  getDelegatablePermissionCatalog,
} from '@/server/organization/permission-delegation-policy'
import { toRbacErrorResponse } from '@/server/organization/rbac-http'
import {
  listEffectivePermissions,
  setMemberPermissionOverrides,
} from '@/server/organization/organization-rbac.service'

const updateOverridesSchema = z.object({
  allow: z.array(z.string()).default([]),
  deny: z.array(z.string()).default([]),
})

function ownerOnlyResponse() {
  return NextResponse.json(
    { error: 'Apenas owner pode gerenciar overrides de permissões.' },
    { status: 403 }
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (access.role !== 'owner') {
    return ownerOnlyResponse()
  }

  const { memberId } = await params
  const target = await prisma.member.findFirst({
    where: {
      id: memberId,
      organizationId: access.teamId,
    },
    select: { id: true },
  })

  if (!target) {
    return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
  }

  try {
    const permissions = await listEffectivePermissions(target.id)
    return NextResponse.json({
      ...permissions,
      permissionCatalog: getDelegatablePermissionCatalog(access.globalRole),
    })
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao listar permissões do membro')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (access.role !== 'owner') {
    return ownerOnlyResponse()
  }

  const body = await request.json().catch(() => null)
  const parsed = updateOverridesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { memberId } = await params
  const target = await prisma.member.findFirst({
    where: {
      id: memberId,
      organizationId: access.teamId,
    },
    select: {
      id: true,
      role: true,
      userId: true,
    },
  })

  if (!target) {
    return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
  }

  try {
    assertCanDelegatePermissions(access.globalRole, [...parsed.data.allow, ...parsed.data.deny])

    const before = await listEffectivePermissions(target.id)
    const updated = await setMemberPermissionOverrides({
      organizationId: access.teamId,
      memberId: target.id,
      allow: parsed.data.allow,
      deny: parsed.data.deny,
    })

    void auditService.log({
      organizationId: access.teamId,
      userId: access.userId,
      action: 'member.permission_overrides_updated',
      resourceType: 'member',
      resourceId: target.id,
      before: {
        role: before.roleKey,
        allowOverrides: before.allowOverrides,
        denyOverrides: before.denyOverrides,
        effectivePermissions: before.effectivePermissions,
      },
      after: {
        role: updated.roleKey,
        allowOverrides: updated.allowOverrides,
        denyOverrides: updated.denyOverrides,
        effectivePermissions: updated.effectivePermissions,
      },
    })

    return NextResponse.json({
      ...updated,
      permissionCatalog: getDelegatablePermissionCatalog(access.globalRole),
    })
  } catch (error) {
    return toRbacErrorResponse(error, 'Erro ao atualizar overrides de permissões')
  }
}
