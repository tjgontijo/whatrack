import "server-only"
import { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

export async function getEfficiencyMetrics(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  projectId?: string
) {
  const dealEfficiencies = await prisma.$queryRaw`
    SELECT
      t.id,
      t."dealValue",
      (t."inboundMessagesCount" + t."outboundMessagesCount")::int as total_messages,
      CASE
        WHEN (t."inboundMessagesCount" + t."outboundMessagesCount") > 0
        THEN t."dealValue" / (t."inboundMessagesCount" + t."outboundMessagesCount")
        ELSE NULL
      END as value_per_message,
      t."resolutionTimeSec"
    FROM crm_deals t
    JOIN crm_deal_statuses ds ON ds.id = t."statusId"
    WHERE t."organizationId" = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND t."projectId" = ${projectId}::uuid` : Prisma.empty}
      AND ds.name = 'closed_won'
      AND t."dealValue" > 0
      AND t."createdAt" BETWEEN ${startDate} AND ${endDate}
    ORDER BY value_per_message DESC
    LIMIT 100;
  `

  const aggregatedEfficiency = await prisma.$queryRaw`
    SELECT
      AVG("dealValue")::int as avg_deal_value,
      AVG("inboundMessagesCount" + "outboundMessagesCount")::int as avg_messages,
      AVG("dealValue" / NULLIF("inboundMessagesCount" + "outboundMessagesCount", 0))::int as avg_value_per_message,
      AVG("resolutionTimeSec")::int as avg_resolution_sec
    FROM crm_deals t
    JOIN crm_deal_statuses ds ON ds.id = t."statusId"
    WHERE t."organizationId" = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND t."projectId" = ${projectId}::uuid` : Prisma.empty}
      AND ds.name = 'closed_won'
      AND t."dealValue" > 0
      AND t."createdAt" BETWEEN ${startDate} AND ${endDate};
  `

  return {
    deals: dealEfficiencies,
    aggregated: aggregatedEfficiency,
  }
}
