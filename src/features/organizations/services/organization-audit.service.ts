import { prisma } from '@/lib/db/prisma'

export async function listOrganizationAuditLogs(input: {
  organizationId: string
  page: number
  pageSize: number
  action?: string
  resourceType?: string
}) {
  const skip = (input.page - 1) * input.pageSize

  const where = {
    organizationId: input.organizationId,
    ...(input.action ? { action: input.action } : {}),
    ...(input.resourceType ? { resourceType: input.resourceType } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.orgAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: input.pageSize,
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

  return {
    data: logs,
    total,
    page: input.page,
    pageSize: input.pageSize,
  }
}

export async function listOrganizationAuditResourceTypes(organizationId: string) {
  const resourceRows = await prisma.orgAuditLog.findMany({
    where: { organizationId },
    distinct: ['resourceType'],
    select: { resourceType: true },
    orderBy: { resourceType: 'asc' },
  })

  return {
    resourceTypes: resourceRows
      .map((item) => item.resourceType)
      .filter((resourceType): resourceType is string => Boolean(resourceType)),
  }
}
