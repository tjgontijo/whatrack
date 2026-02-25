import { prisma } from '@/lib/db/prisma'

export async function getSlaMetrics(organizationId: string, startDate: Date, endDate: Date) {
  const distribution = await prisma.$queryRaw`
    SELECT
      bucket,
      COUNT(*)::int as count,
      AVG(first_response_time_sec)::int as avg_time
    FROM (
      SELECT
        first_response_time_sec,
        CASE
          WHEN first_response_time_sec <= 60 THEN '< 1 min'
          WHEN first_response_time_sec <= 300 THEN '1-5 min'
          WHEN first_response_time_sec <= 900 THEN '5-15 min'
          WHEN first_response_time_sec <= 3600 THEN '15-60 min'
          ELSE '> 1 hora'
        END as bucket
      FROM tickets
      WHERE organization_id = ${organizationId}::uuid
        AND first_response_time_sec IS NOT NULL
        AND created_at BETWEEN ${startDate} AND ${endDate}
    ) sub
    GROUP BY bucket;
  `

  // Get worst SLAs mapped to user
  const worstSlas = await prisma.$queryRaw`
    SELECT
      t.id as ticket_id,
      l.name as lead_name,
      l.phone as lead_phone,
      t.first_response_time_sec,
      t.created_at,
      u.name as assignee_name
    FROM tickets t
    JOIN conversations c ON c.id = t.conversation_id
    JOIN leads l ON l.id = c.lead_id
    LEFT JOIN "user" u ON u.id = t.assignee_id
    WHERE t.organization_id = ${organizationId}::uuid
      AND t.first_response_time_sec > 900
      AND t.created_at BETWEEN ${startDate} AND ${endDate}
    ORDER BY t.first_response_time_sec DESC
    LIMIT 10;
  `

  return {
    distribution,
    worstSlas,
  }
}
