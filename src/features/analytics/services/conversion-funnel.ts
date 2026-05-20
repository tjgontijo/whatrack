import "server-only"
import { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

export async function getConversionFunnel(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  projectId?: string
) {
  const [statusOverview, stageOverview] = await Promise.all([
    // Query to get deals by status
    prisma.$queryRaw`
    SELECT
      ds.name as status,
      COUNT(*)::int as count,
      COALESCE(SUM(d."dealValue"), 0) as total_value
    FROM crm_deals d
    JOIN crm_deal_statuses ds ON ds.id = d."statusId"
    WHERE d."organizationId" = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND d."projectId" = ${projectId}::uuid` : Prisma.empty}
      AND d."createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY ds.name;
  `,

    // Query to get deals by stage
    prisma.$queryRaw`
    SELECT
      ts.id,
      ts.name as stage_name,
      ts.color,
      ts.order,
      COUNT(t.id)::int as deal_count,
      COALESCE(SUM(t."dealValue"), 0) as total_value
    FROM crm_deal_stages ts
    LEFT JOIN crm_deals t ON t."stageId" = ts.id
      AND t."createdAt" BETWEEN ${startDate} AND ${endDate}
      ${projectId ? Prisma.sql`AND t."projectId" = ${projectId}::uuid` : Prisma.empty}
    WHERE ts."organizationId" = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND ts."projectId" = ${projectId}::uuid` : Prisma.empty}
    GROUP BY ts.id, ts.name, ts.color, ts.order
    ORDER BY ts.order ASC;
  `,
  ])

  return {
    statusOverview,
    stageOverview,
  }
}
