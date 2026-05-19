import 'server-only'
import { findConversationIntelligenceContext } from '../repositories/conversation-intelligence.repository'
import { ConversationIntelligenceSchema } from '../schemas/conversation-intelligence.schemas'
import type { ConversationIntelligenceDTO } from '../schemas/conversation-intelligence.schemas'

export async function getConversationIntelligence(params: {
  organizationId: string
  conversationId: string
}): Promise<{ data: ConversationIntelligenceDTO } | { error: string; status: number }> {
  const { conversation, deal } = await findConversationIntelligenceContext(params)

  if (!conversation) {
    return { error: 'Conversa não encontrada', status: 404 }
  }

  const now = new Date()

  const lastInboundAt = deal?.lastInboundAt ?? null
  const lastOutboundAt = deal?.lastOutboundAt ?? null

  const secondsSinceLastInbound = lastInboundAt
    ? Math.floor((now.getTime() - lastInboundAt.getTime()) / 1000)
    : null

  const secondsSinceLastOutbound = lastOutboundAt
    ? Math.floor((now.getTime() - lastOutboundAt.getTime()) / 1000)
    : null

  const lastMessageDirection =
    lastInboundAt && lastOutboundAt
      ? lastInboundAt > lastOutboundAt
        ? 'inbound'
        : 'outbound'
      : lastInboundAt
        ? 'inbound'
        : lastOutboundAt
          ? 'outbound'
          : null

  const inbound = deal?.inboundMessagesCount ?? 0
  const outbound = deal?.outboundMessagesCount ?? 0
  const inboundOutboundRatio = outbound > 0 ? inbound / outbound : null

  const dealAgeSec = deal
    ? Math.floor((now.getTime() - deal.createdAt.getTime()) / 1000)
    : null

  const stageAgeSec = deal?.stageEnteredAt
    ? Math.floor((now.getTime() - deal.stageEnteredAt.getTime()) / 1000)
    : null

  const windowSecondsRemaining = deal?.windowExpiresAt
    ? Math.floor((deal.windowExpiresAt.getTime() - now.getTime()) / 1000)
    : null

  const lead = deal?.conversation?.lead ?? null
  const tracking = deal?.tracking ?? null

  const dto: ConversationIntelligenceDTO = {
    computedAt: now.toISOString(),
    timing: {
      firstResponseTimeSec: deal?.firstResponseTimeSec ?? null,
      avgResponseTimeSec: conversation.avgResponseTimeSec,
      secondsSinceLastInbound,
      secondsSinceLastOutbound,
      lastMessageDirection: lastMessageDirection as 'inbound' | 'outbound' | null,
      lastInboundAt: lastInboundAt?.toISOString() ?? null,
      lastOutboundAt: lastOutboundAt?.toISOString() ?? null,
    },
    volume: deal
      ? {
          inboundMessagesCount: inbound,
          outboundMessagesCount: outbound,
          totalMessagesCount: deal.messagesCount,
          inboundOutboundRatio,
        }
      : null,
    pipeline:
      deal && dealAgeSec !== null
        ? {
            dealCreatedAt: deal.createdAt.toISOString(),
            dealAgeSec,
            stageEnteredAt: deal.stageEnteredAt?.toISOString() ?? null,
            stageAgeSec,
            windowOpen: deal.windowOpen,
            windowExpiresAt: deal.windowExpiresAt?.toISOString() ?? null,
            windowSecondsRemaining,
          }
        : null,
    lead: lead
      ? {
          totalDeals: lead.totalDeals,
          lifetimeValue: lead.lifetimeValue.toString(),
          firstMessageAt: lead.firstMessageAt?.toISOString() ?? null,
          leadCreatedAt: lead.createdAt.toISOString(),
        }
      : null,
    attribution: tracking
      ? {
          sourceType: tracking.sourceType,
          utmSource: tracking.utmSource,
          utmMedium: tracking.utmMedium,
          utmCampaign: tracking.utmCampaign,
          utmContent: tracking.utmContent,
          utmTerm: tracking.utmTerm,
          ctwaclid: tracking.ctwaclid,
          gclid: tracking.gclid,
          fbclid: tracking.fbclid,
          referrerUrl: tracking.referrerUrl,
          landingPage: tracking.landingPage,
          metaAdName: tracking.metaAdName,
          metaAdSetName: tracking.metaAdSetName,
          metaCampaignName: tracking.metaCampaignName,
        }
      : null,
  }

  const parsed = ConversationIntelligenceSchema.safeParse(dto)
  if (!parsed.success) {
    return { error: 'Erro interno de validação', status: 500 }
  }

  return { data: parsed.data }
}
