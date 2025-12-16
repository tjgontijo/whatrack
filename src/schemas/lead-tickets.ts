import { z } from 'zod'

export const ticketSchema = z.object({
  id: z.string(),
  status: z.string().nullable(),
  pipefyId: z.string().nullable(),
  gclid: z.string().nullable(),
  fbclid: z.string().nullable(),
  ctwaclid: z.string().nullable(),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  utmTerm: z.string().nullable(),
  utmContent: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pipefyUrl: z.string().url().nullable(),
})

export const ticketStatusSummarySchema = z.object({
  status: z.string().nullable(),
  count: z.number().int().nonnegative(),
})

export const ticketChannelSummarySchema = z.object({
  source: z.string().nullable(),
  medium: z.string().nullable(),
  count: z.number().int().nonnegative(),
})

export const leadTicketsResponseSchema = z.object({
  lead: z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    createdAt: z.string(),
  }),
  totals: z.object({
    tickets: z.number().int().nonnegative(),
    byStatus: z.array(ticketStatusSummarySchema),
    byChannel: z.array(ticketChannelSummarySchema),
  }),
  tickets: z.array(ticketSchema),
})

export type LeadTicketsResponse = z.infer<typeof leadTicketsResponseSchema>
export type LeadTicket = z.infer<typeof ticketSchema>
export type LeadTicketStatusSummary = z.infer<typeof ticketStatusSummarySchema>
export type LeadTicketChannelSummary = z.infer<typeof ticketChannelSummarySchema>

export const ticketListItemSchema = ticketSchema.extend({
  leadId: z.string().uuid().nullable(),
  leadName: z.string().nullable(),
  leadPhone: z.string().nullable(),
  leadInstagram: z.string().nullable(),
  leadMail: z.string().nullable(),
})

export const ticketsListResponseSchema = z.object({
  items: z.array(ticketListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  availableStatuses: z.array(z.string().nullable()),
})

export type TicketListItem = z.infer<typeof ticketListItemSchema>
export type TicketsListResponse = z.infer<typeof ticketsListResponseSchema>

export const saleServiceSchema = z.object({
  name: z.string().nullable(),
  quantity: z.number().nullable(),
  price: z.number().nullable(),
})

export const saleTicketSummarySchema = z.object({
  id: z.string(),
  pipefyId: z.string().nullable(),
  pipefyUrl: z.string().url().nullable(),
  status: z.string().nullable(),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  createdAt: z.string(),
})

export const saleSchema = z.object({
  id: z.string(),
  amount: z.number().nullable(),
  serviceCount: z.number().int().nullable(),
  fbtraceId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  services: z.array(saleServiceSchema),
  rawDescription: z.unknown().nullable(),
  ticket: saleTicketSummarySchema.nullable(),
})

export const saleListItemSchema = z.object({
  id: z.string(),
  amount: z.number().nullable(),
  serviceCount: z.number().int().nullable(),
  fbtraceId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ticketId: z.string().nullable(),
  ticketStatus: z.string().nullable(),
  ticketPipefyId: z.string().nullable(),
  ticketPipefyUrl: z.string().nullable(),
  ticketUtmSource: z.string().nullable(),
  ticketUtmMedium: z.string().nullable(),
  ticketUtmCampaign: z.string().nullable(),
  leadId: z.string().nullable(),
  leadName: z.string().nullable(),
  leadPhone: z.string().nullable(),
  leadInstagram: z.string().nullable(),
  leadMail: z.string().nullable(),
})

export const salesListResponseSchema = z.object({
  items: z.array(saleListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  availableStatuses: z.array(z.string().nullable()),
})

export type SaleListItem = z.infer<typeof saleListItemSchema>
export type SalesListResponse = z.infer<typeof salesListResponseSchema>

export const salesByServiceSliceSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number().nonnegative(),
})

export const salesByServiceResponseSchema = z.object({
  slices: z.array(salesByServiceSliceSchema),
})

export type SalesByServiceSlice = z.infer<typeof salesByServiceSliceSchema>
export type SalesByServiceResponse = z.infer<typeof salesByServiceResponseSchema>

export const leadSalesResponseSchema = z.object({
  lead: z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    createdAt: z.string(),
  }),
  totals: z.object({
    sales: z.number().int().nonnegative(),
    totalAmount: z.number(),
  }),
  sales: z.array(saleSchema),
})

export type LeadSaleService = z.infer<typeof saleServiceSchema>
export type LeadSaleTicketSummary = z.infer<typeof saleTicketSummarySchema>
export type LeadSale = z.infer<typeof saleSchema>
export type LeadSalesResponse = z.infer<typeof leadSalesResponseSchema>

export const metaAdsMetricInputSchema = z.object({
  reportDate: z.string().min(1),
  campaign: z.string().min(1),
  campaignId: z.string().min(1),
  adset: z.string().min(1),
  adsetId: z.string().min(1),
  ad: z.string().min(1),
  adId: z.string().min(1),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  results: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
})

export const metaAdsMetricPayloadSchema = z.array(metaAdsMetricInputSchema).min(1)

export type MetaAdsMetricInput = z.infer<typeof metaAdsMetricInputSchema>
