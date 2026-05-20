import "server-only"
import { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

export async function getSlaMetrics(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  projectId?: string
) {
  const [distribution, worstSlas] = await Promise.all([
    prisma.$queryRaw`
    SELECT
      bucket,
      COUNT(*)::int as count,
      AVG("firstResponseTimeSec")::int as avg_time
    FROM (
      SELECT
        "firstResponseTimeSec",
        CASE
          WHEN "firstResponseTimeSec" <= 60 THEN '< 1 min'
          WHEN "firstResponseTimeSec" <= 300 THEN '1-5 min'
          WHEN "firstResponseTimeSec" <= 900 THEN '5-15 min'
          WHEN "firstResponseTimeSec" <= 3600 THEN '15-60 min'
          ELSE '> 1 hora'
        END as bucket
      FROM crm_deals
      WHERE "organizationId" = ${organizationId}::uuid
        ${projectId ? Prisma.sql`AND "projectId" = ${projectId}::uuid` : Prisma.empty}
        AND "firstResponseTimeSec" IS NOT NULL
        AND "createdAt" BETWEEN ${startDate} AND ${endDate}
    ) sub
    GROUP BY bucket;
  `,

    // Get worst SLAs mapped to user
    prisma.$queryRaw`
    SELECT
      t.id as deal_id,
      l.name as lead_name,
      l.phone as lead_phone,
      t."firstResponseTimeSec",
      t."createdAt",
      u.name as assignee_name
    FROM crm_deals t
    JOIN crm_conversations c ON c.id = t."conversationId"
    JOIN crm_leads l ON l.id = c."leadId"
    LEFT JOIN auth_user u ON u.id = t."assigneeId"
    WHERE t."organizationId" = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND t."projectId" = ${projectId}::uuid` : Prisma.empty}
      AND t."firstResponseTimeSec" > 900
      AND t."createdAt" BETWEEN ${startDate} AND ${endDate}
    ORDER BY t."firstResponseTimeSec" DESC
    LIMIT 10;
  `,
  ])

  return {
    distribution,
    worstSlas,
  }
}
