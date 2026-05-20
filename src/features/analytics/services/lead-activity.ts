import "server-only"
import { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

export async function getLeadActivity(organizationId: string, projectId?: string) {
  const waitingLeads = await prisma.$queryRaw`
    SELECT
      l.id,
      l.name,
      l.phone,
      l."pushName",
      c."lastInboundAt",
      c."lastOutboundAt",
      EXTRACT(EPOCH FROM (NOW() - c."lastInboundAt"))::int as seconds_waiting,
      t.id as deal_id,
      ts.name as stage_name
    FROM crm_conversations c
    JOIN crm_leads l ON l.id = c."leadId"
    JOIN crm_deals t ON t."conversationId" = c.id
    JOIN crm_deal_statuses ds ON ds.id = t."statusId" AND ds.name = 'open'
    JOIN crm_deal_stages ts ON ts.id = t."stageId"
    WHERE c."organizationId" = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND c."projectId" = ${projectId}::uuid` : Prisma.empty}
      AND c."lastInboundAt" > COALESCE(c."lastOutboundAt", '1970-01-01')
    ORDER BY c."lastInboundAt" ASC
    LIMIT 20;
  `

  const forgottenLeads = await prisma.$queryRaw`
    SELECT
      l.id,
      l.name,
      l.phone,
      c."lastOutboundAt",
      (EXTRACT(EPOCH FROM (NOW() - c."lastOutboundAt")) / 3600)::int as hours_since_outbound,
      t.id as deal_id
    FROM crm_conversations c
    JOIN crm_leads l ON l.id = c."leadId"
    JOIN crm_deals t ON t."conversationId" = c.id
    JOIN crm_deal_statuses ds ON ds.id = t."statusId" AND ds.name = 'open'
    WHERE c."organizationId" = ${organizationId}::uuid
      ${projectId ? Prisma.sql`AND c."projectId" = ${projectId}::uuid` : Prisma.empty}
      AND c."lastOutboundAt" IS NOT NULL
      AND c."lastOutboundAt" < NOW() - INTERVAL '24 hours'
      AND (c."lastInboundAt" IS NULL OR c."lastInboundAt" < c."lastOutboundAt")
    ORDER BY c."lastOutboundAt" ASC;
  `

  return {
    waitingLeads,
    forgottenLeads,
  }
}
