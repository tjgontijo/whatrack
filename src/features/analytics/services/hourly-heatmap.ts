import "server-only"
import { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

export async function getHourlyHeatmap(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  projectId?: string
) {
  const heatmap = await prisma.$queryRaw`
    SELECT
      EXTRACT(DOW FROM m.timestamp)::int as day_of_week,
      EXTRACT(HOUR FROM m.timestamp)::int as hour,
      COUNT(*)::int as message_count
    FROM whatsapp_messages m
    JOIN crm_leads l ON l.id = m."leadId"
    JOIN crm_message_directions md ON md.id = m."directionId"
    WHERE l."organizationId" = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND m."instanceId" IN (SELECT id FROM whatsapp_configs WHERE "projectId" = ${projectId}::uuid)` : Prisma.empty}
      AND md.name = 'INBOUND'
      AND m.timestamp BETWEEN ${startDate} AND ${endDate}
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour;
  `

  return heatmap
}
