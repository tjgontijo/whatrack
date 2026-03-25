import { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

export async function getConversionFunnel(organizationId: string, startDate: Date, endDate: Date, projectId?: string) {
  // Query to get tickets by status
  const statusOverview = await prisma.$queryRaw`
    SELECT
      status,
      COUNT(*)::int as count,
      COALESCE(SUM(deal_value), 0) as total_value
    FROM tickets
    WHERE organization_id = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND project_id = ${projectId}::uuid` : Prisma.empty}
      AND created_at BETWEEN ${startDate} AND ${endDate}
    GROUP BY status;
  `

  // Query to get tickets by stage
  const stageOverview = await prisma.$queryRaw`
    SELECT
      ts.id,
      ts.name as stage_name,
      ts.color,
      ts.order,
      COUNT(t.id)::int as ticket_count,
      COALESCE(SUM(t.deal_value), 0) as total_value
    FROM ticket_stages ts
    LEFT JOIN tickets t ON t.stage_id = ts.id
      AND t.created_at BETWEEN ${startDate} AND ${endDate}
      ${projectId ? Prisma.sql`AND t.project_id = ${projectId}::uuid` : Prisma.empty}
    WHERE ts.organization_id = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND ts.project_id = ${projectId}::uuid` : Prisma.empty}
    GROUP BY ts.id, ts.name, ts.color, ts.order
    ORDER BY ts.order ASC;
  `

  return {
    statusOverview,
    stageOverview,
  }
}
