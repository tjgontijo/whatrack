import { prisma } from '@/lib/prisma';

export async function getHourlyHeatmap(organizationId: string, startDate: Date, endDate: Date) {
    const heatmap = await prisma.$queryRaw`
    SELECT
      EXTRACT(DOW FROM timestamp)::int as day_of_week,
      EXTRACT(HOUR FROM timestamp)::int as hour,
      COUNT(*)::int as message_count
    FROM messages m
    JOIN leads l ON l.id = m.lead_id
    WHERE l.organization_id = ${organizationId}::uuid
      AND m.direction = 'INBOUND'
      AND m.timestamp BETWEEN ${startDate} AND ${endDate}
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour;
  `;

    return heatmap;
}
