import { z } from 'zod'

const TimingSchema = z.object({
  firstResponseTimeSec: z.number().nullable(),
  avgResponseTimeSec: z.number().nullable(),
  secondsSinceLastInbound: z.number().nullable(),
  secondsSinceLastOutbound: z.number().nullable(),
  lastMessageDirection: z.enum(['inbound', 'outbound']).nullable(),
  lastInboundAt: z.string().datetime().nullable(),
  lastOutboundAt: z.string().datetime().nullable(),
})

const VolumeSchema = z.object({
  inboundMessagesCount: z.number(),
  outboundMessagesCount: z.number(),
  totalMessagesCount: z.number(),
  inboundOutboundRatio: z.number().nullable(),
})

const PipelineSchema = z.object({
  dealCreatedAt: z.string().datetime(),
  dealAgeSec: z.number(),
  stageEnteredAt: z.string().datetime().nullable(),
  stageAgeSec: z.number().nullable(),
  windowOpen: z.boolean(),
  windowExpiresAt: z.string().datetime().nullable(),
  windowSecondsRemaining: z.number().nullable(),
})

const LeadSchema = z.object({
  totalDeals: z.number(),
  lifetimeValue: z.string(),
  firstMessageAt: z.string().datetime().nullable(),
  leadCreatedAt: z.string().datetime(),
})

const AttributionSchema = z.object({
  sourceType: z.string().nullable(),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  utmContent: z.string().nullable(),
  utmTerm: z.string().nullable(),
  ctwaclid: z.string().nullable(),
  gclid: z.string().nullable(),
  fbclid: z.string().nullable(),
  referrerUrl: z.string().nullable(),
  landingPage: z.string().nullable(),
  metaAdName: z.string().nullable(),
  metaAdSetName: z.string().nullable(),
  metaCampaignName: z.string().nullable(),
})

export const ConversationIntelligenceSchema = z.object({
  computedAt: z.string().datetime(),
  timing: TimingSchema,
  volume: VolumeSchema.nullable(),
  pipeline: PipelineSchema.nullable(),
  lead: LeadSchema.nullable(),
  attribution: AttributionSchema.nullable(),
})

export type ConversationIntelligenceDTO = z.infer<typeof ConversationIntelligenceSchema>
