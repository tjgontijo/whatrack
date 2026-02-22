import { prisma } from '@/lib/prisma';

export async function getLeadActivity(organizationId: string) {
    const waitingLeads = await prisma.$queryRaw`
    SELECT
      l.id,
      l.name,
      l.phone,
      l.push_name,
      c.last_inbound_at,
      c.last_outbound_at,
      EXTRACT(EPOCH FROM (NOW() - c.last_inbound_at))::int as seconds_waiting,
      t.id as ticket_id,
      ts.name as stage_name
    FROM conversations c
    JOIN leads l ON l.id = c.lead_id
    JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
    JOIN ticket_stages ts ON ts.id = t.stage_id
    WHERE c.organization_id = ${organizationId}::uuid
      AND c.last_inbound_at > COALESCE(c.last_outbound_at, '1970-01-01')
    ORDER BY c.last_inbound_at ASC
    LIMIT 20;
  `;

    const forgottenLeads = await prisma.$queryRaw`
    SELECT
      l.id,
      l.name,
      l.phone,
      c.last_outbound_at,
      (EXTRACT(EPOCH FROM (NOW() - c.last_outbound_at)) / 3600)::int as hours_since_outbound,
      t.id as ticket_id
    FROM conversations c
    JOIN leads l ON l.id = c.lead_id
    JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
    WHERE c.organization_id = ${organizationId}::uuid
      AND c.last_outbound_at IS NOT NULL
      AND c.last_outbound_at < NOW() - INTERVAL '24 hours'
      AND (c.last_inbound_at IS NULL OR c.last_inbound_at < c.last_outbound_at)
    ORDER BY c.last_outbound_at ASC;
  `;

    return {
        waitingLeads,
        forgottenLeads,
    };
}
