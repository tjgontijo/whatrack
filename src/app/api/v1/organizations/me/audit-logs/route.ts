import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'
import { legacyOrganizationJson } from '@/server/http/legacy-organization'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  resourceType: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:audit')
  if (!access.hasAccess || !access.teamId) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me/audit-logs'
    )
  }

  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return legacyOrganizationJson(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 },
      '/api/v1/organizations/me/audit-logs'
    )
  }

  const { page, pageSize, action, resourceType } = parsed.data
  const skip = (page - 1) * pageSize

  const where = {
    organizationId: access.teamId,
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.orgAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),
    prisma.orgAuditLog.count({ where }),
  ])

  return legacyOrganizationJson(
    {
      data: logs,
      total,
      page,
      pageSize,
    },
    { status: 200 },
    '/api/v1/organizations/me/audit-logs'
  )
}
