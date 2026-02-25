import { prisma } from '@/lib/db/prisma'

export async function getEfficiencyMetrics(organizationId: string, startDate: Date, endDate: Date) {
  const ticketEfficiencies = await prisma.$queryRaw`
    SELECT
      t.id,
      t.deal_value,
      (t.inbound_messages_count + t.outbound_messages_count)::int as total_messages,
      CASE
        WHEN (t.inbound_messages_count + t.outbound_messages_count) > 0
        THEN t.deal_value / (t.inbound_messages_count + t.outbound_messages_count)
        ELSE NULL
      END as value_per_message,
      t.resolution_time_sec
    FROM tickets t
    WHERE t.organization_id = ${organizationId}::uuid
      AND t.status = 'closed_won'
      AND t.deal_value > 0
      AND t.created_at BETWEEN ${startDate} AND ${endDate}
    ORDER BY value_per_message DESC
    LIMIT 100;
  `

  const aggregatedEfficiency = await prisma.$queryRaw`
    SELECT
      AVG(deal_value)::int as avg_deal_value,
      AVG(inbound_messages_count + outbound_messages_count)::int as avg_messages,
      AVG(deal_value / NULLIF(inbound_messages_count + outbound_messages_count, 0))::int as avg_value_per_message,
      AVG(resolution_time_sec)::int as avg_resolution_sec
    FROM tickets
    WHERE organization_id = ${organizationId}::uuid
      AND status = 'closed_won'
      AND deal_value > 0
      AND created_at BETWEEN ${startDate} AND ${endDate};
  `

  return {
    tickets: ticketEfficiencies,
    aggregated: aggregatedEfficiency,
  }
}
